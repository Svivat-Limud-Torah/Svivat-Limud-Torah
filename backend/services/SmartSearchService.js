// backend/services/SmartSearchService.js
const fs = require('fs').promises;
const path = require('path');
const fg = require('fast-glob');
const https = require('https');

// Create a custom HTTPS agent that ignores SSL certificate issues
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// Constants inspired by searchLogicV2.js (can be adjusted or moved)
const DEFAULT_TEXT_EXTENSIONS_FOR_SMART_SEARCH = [
    '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.less',
    '.xml', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log', '.sh', '.bash', '.py', '.rb', '.php',
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.swift', '.kt', '.kts', '.dart',
    '.vue', '.svelte', '.pl', '.pm', '.tcl', '.vb', '.vbs', '.csv', '.tsv', '.rtf', '.tex', '.text'
];

const DEFAULT_EXCLUDE_PATTERNS_FOR_SMART_SEARCH = [
    'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**',
    '.vscode/**', '.idea/**', '*.lock',
    // Excluding common binary types explicitly to be safe, though extension filter should catch most
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.bmp', '*.ico', '*.webp', '*.svg',
    '*.mp3', '*.wav', '*.ogg', '*.flac', '*.mp4', '*.mov', '*.avi', '*.mkv',
    '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt', '*.pptx',
    '*.zip', '*.tar', '*.gz', '*.rar', '*.7z',
    '*.exe', '*.dll', '*.so', '*.app', '*.dmg',
    '*.class', '*.jar', '*.pyc', '*.pyd', '*.o', '*.a',
    '*.DS_Store'
];

// Helper to dynamically import node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GOOGLE_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * Step 1: Gets all text file paths within a workspace.
 * Returns name, relativePath, and absolutePath.
 * @param {string} workspacePath - Absolute path to the workspace.
 * @returns {Promise<Array<{ name: string, relativePath: string, absolutePath: string }>>}
 */
async function getAllTextFilePathsWithAbsolute(workspacePath) {
    const globPatterns = DEFAULT_TEXT_EXTENSIONS_FOR_SMART_SEARCH.map(ext => `**/*${ext}`);
    const files = await fg(globPatterns, {
        cwd: workspacePath,
        dot: true,
        ignore: DEFAULT_EXCLUDE_PATTERNS_FOR_SMART_SEARCH,
        onlyFiles: true,
        absolute: true, // Get absolute paths
        caseSensitiveMatch: false,
        followSymbolicLinks: false,
    });

    return files.map(absoluteFilePath => ({
        name: path.basename(absoluteFilePath),
        relativePath: path.relative(workspacePath, absoluteFilePath).replace(/\\/g, '/'),
        absolutePath: absoluteFilePath.replace(/\\/g, '/'), // Ensure consistent slash format
    }));
}

/**
 * Step 2: Selects the top N relevant files using AI.
 * AI is given file data (including absolute paths for context) but should return relative paths.
 * @param {Array<{ name: string, relativePath: string, absolutePath: string }>} allFilesData - List of all text files.
 * @param {string} userQuery - The user's search query.
 * @param {number} numFilesToScan - The number of files the AI should select.
 * @param {string} model - The AI model to use.
 * @param {string} apiKey - The Google API key.
 * @returns {Promise<Array<string>>} - Array of up to N relative file paths deemed most relevant.
 */
async function selectTopNFilesWithAI(allFilesData, userQuery, numFilesToScan, model, apiKey) {
    if (!allFilesData || allFilesData.length === 0) {
        return [];
    }

    // Provide AI with name, absolutePath (for its decision making), and relativePath (for it to return)
    const filesForPrompt = allFilesData.map(f => ({
        name: f.name,
        absolutePath: f.absolutePath,
        relativePath: f.relativePath
    }));

    const prompt = `בהינתן שאילתת המשתמש: "${userQuery}" ורשימת הקבצים הבאה (הכוללת שם, נתיב מלא, ונתיב יחסי):
${JSON.stringify(filesForPrompt, null, 2)}

אנא בחר את ${numFilesToScan} הקבצים שהכי סביר שיכילו את התשובה לשאילתה.
הבדיקה שלך צריכה להתבסס גם על שם הקובץ וגם על הנתיב המלא שלו (absolutePath).

הפלט הנדרש:
החזר מערך JSON של הנתיבים היחסיים ( הערך של 'relativePath' מהקלט שקיבלת עבור כל קובץ) של עד ${numFilesToScan} הקבצים שנבחרו.
לדוגמה, אם קלטת קובץ עם 'absolutePath': "/user/project/src/module.txt" ו-'relativePath': "src/module.txt",
ובחרת אותו, הפלט עבור קובץ זה צריך להיות "src/module.txt".
אם יש פחות מ-${numFilesToScan} קבצים רלוונטיים, החזר את כל הרלוונטיים.
אם אף קובץ אינו נראה רלוונטי, החזר מערך ריק [].

פורמט הפלט לדוגמה: ["src/important_doc.txt", "user_guides/guide.txt", "config/settings.json"]

חשוב מאוד: הפלט שלך חייב להיות אך ורק מחרוזת JSON תקינה. אל תכלול שום טקסט נוסף, הסברים, או סימוני markdown לפני או אחרי ה-JSON.
`;

    try {
        const fetch = require('node-fetch');
        const response = await fetch(`${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            agent: httpsAgent // Use our custom agent
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Google API Error (selectTopNFilesWithAI, N=${numFilesToScan}):`, response.status, errorText);
            throw new Error(`Google API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }
        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            console.warn(`No text response from AI for file selection (top ${numFilesToScan}).`);
            return [];
        }
        const cleanedResponse = textResponse.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const relevantRelativePaths = JSON.parse(cleanedResponse);

        if (Array.isArray(relevantRelativePaths)) {
            const originalRelativePathsSet = new Set(allFilesData.map(f => f.relativePath));
            return relevantRelativePaths.filter(p => typeof p === 'string' && originalRelativePathsSet.has(p)).slice(0, numFilesToScan);
        }
        console.warn(`AI response for file selection (top ${numFilesToScan}) was not a valid JSON array:`, cleanedResponse);
        return [];
    } catch (error) {
        console.error(`Error selecting top ${numFilesToScan} relevant files with AI:`, error);
        return []; // Graceful failure: proceed with no selection
    }
}

/**
 * Step 3 (part 2): Extracts answer from the content of multiple files using AI.
 * @param {Array<{filePath: string, content: string}>} filesWithContent - Array of objects, each with relative filePath and its content.
 * @param {string} userQuery - The user's search query.
 * @param {string} model - The AI model to use.
 * @param {string} apiKey - The Google API key.
 * @returns {Promise<object>} - Object with { quote, sourceFile, lineNumber, found: boolean, error?: string }
 */
async function extractAnswerFromMultipleContents(filesWithContent, userQuery, model, apiKey) {
    if (!filesWithContent || filesWithContent.length === 0) {
        return { found: false, error: "No content provided to search." };
    }

    const contentForPrompt = filesWithContent.map(file => ({
        filePath: file.filePath, // This is the relative path
        content: file.content
    }));

    const prompt = `בהינתן שאילתת המשתמש: "${userQuery}" והתוכן של הקבצים הבאים:
${JSON.stringify(contentForPrompt, null, 2)}

אנא בצע את הפעולות הבאות:
1.  עבור על תוכן כל הקבצים שסופקו.
2.  מצא את התשובה הטובה ביותר לשאילתת המשתמש.
3.  צטט את קטע הטקסט המדויק מהמקור המכיל את התשובה.
4.  ציין את הנתיב המדויק של הקובץ ('filePath') שממנו נלקח הציטוט (כפי שסופק לך במערך הקלט).
5.  ציין את מספר השורה שבה מתחיל הציטוט בתוך אותו קובץ (השורה הראשונה היא 1).

הפלט הנדרש:
החזר אובייקט JSON בודד עם המפתחות הבאים:
-   "quote": (string) הציטוט המדויק.
-   "sourceFile": (string) ה-'filePath' של הקובץ המכיל את הציטוט.
-   "lineNumber": (number) מספר השורה של תחילת הציטוט.
-   "found": (boolean) true אם נמצאה תשובה, false אחרת.

אם לא נמצאה תשובה באף אחד מהקבצים, החזר אובייקט עם "found": false. במקרה זה, שדות "quote", "sourceFile", "lineNumber" יכולים להיות ריקים, null, או לא להיכלל.
ודא שהציטוט הוא מדויק מהטקסט שסופק.

שאילתת המשתמש: "${userQuery}"

חשוב מאוד: הפלט שלך חייב להיות אך ורק מחרוזת JSON תקינה. אל תכלול שום טקסט נוסף, הסברים, או סימוני markdown לפני או אחרי ה-JSON.
`;

    try {
        const fetch = require('node-fetch');
        const response = await fetch(`${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            agent: httpsAgent // Use our custom agent
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Google API Error (extractAnswerFromMultipleContents):", response.status, errorText);
            return { found: false, error: `Google API error: ${response.statusText}. Details: ${errorText}` };
        }
        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            console.warn("No text response from AI for answer extraction from multiple contents.");
            return { found: false, error: "No text response from AI." };
        }
        const cleanedResponse = textResponse.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const result = JSON.parse(cleanedResponse);

        if (typeof result.found === 'boolean') {
            if (result.found) {
                if (!result.quote || !result.sourceFile || typeof result.lineNumber !== 'number') {
                    console.warn("AI found an answer but response structure is incomplete:", cleanedResponse);
                    return { ...result, found: true, error: "Incomplete answer structure from AI."};
                }
                if (!filesWithContent.some(f => f.filePath === result.sourceFile)) {
                    console.warn("AI returned a sourceFile not in the input list:", result.sourceFile, "Expected one of:", filesWithContent.map(f=>f.filePath));
                    return { found: false, error: "AI returned an invalid sourceFile not present in the input." };
                }
            }
            return result; // Contains quote, sourceFile, lineNumber, found
        }
        console.warn("AI response for answer extraction was not a valid JSON object with 'found' field:", cleanedResponse);
        return { found: false, error: "Invalid JSON structure from AI." };
    } catch (error) {
        console.error("Error extracting answer from multiple contents with AI:", error);
        return { found: false, error: error.message };
    }
}

/**
 * Main function to perform the 4-step smart search.
 * @param {string} workspacePath - Absolute path to the workspace.
 * @param {string} userQuery - The user's search query.
 * @param {number} numFilesToScan - The number of files the AI should select and scan.
 * @param {string} model - The AI model to use.
 * @param {string} apiKey - The Google API key.
 * @returns {Promise<object>} - Result object { quote, sourceFile, lineNumber, found: true } or { notFound: true, reason: string, ...details }
 */
async function performSmartSearch(workspacePath, userQuery, numFilesToScan, model, apiKey) {
    // Step 1: Get all text files
    let allFilesData;
    try {
        allFilesData = await getAllTextFilePathsWithAbsolute(workspacePath);
    } catch (error) {
        console.error("Smart Search - Step 1 Error (getAllTextFilePathsWithAbsolute):", error);
        return { notFound: true, reason: `שגיאה בשלב 1: קריאת רשימת הקבצים מהתיקייה. ${error.message}` };
    }

    if (!allFilesData || allFilesData.length === 0) {
        return { notFound: true, reason: "לא נמצאו קבצי טקסט לחיפוש בסביבת העבודה.", filesConsideredCount: 0 };
    }

    // Step 2: Select top N relevant files using AI
    let topNRelativePaths;
    try {
        // Ensure numFilesToScan is a positive integer, default to a sensible value if not.
        const validNumFilesToScan = (typeof numFilesToScan === 'number' && numFilesToScan > 0) ? numFilesToScan : 2; // Default to 2 if invalid
        topNRelativePaths = await selectTopNFilesWithAI(allFilesData, userQuery, validNumFilesToScan, model, apiKey);
    } catch (error) { 
        console.error("Smart Search - Step 2 Error (selectTopNFilesWithAI):", error);
        return { notFound: true, reason: `שגיאה בשלב 2: בחירת קבצים רלוונטיים. ${error.message}`, filesConsideredCount: allFilesData.length };
    }

    if (!topNRelativePaths || topNRelativePaths.length === 0) {
        return { notFound: true, reason: "הבינה המלאכותית לא בחרה קבצים רלוונטיים לשאילתה.", filesConsideredCount: allFilesData.length, filesSelectedCount: 0 };
    }

    // Step 3 (part 1): Read content of the selected files
    const filesWithContent = [];
    for (const relativeFilePath of topNRelativePaths) {
        const absoluteFilePath = path.join(workspacePath, relativeFilePath); // Reconstruct absolute path
        try {
            const content = await fs.readFile(absoluteFilePath, 'utf-8');
            filesWithContent.push({ filePath: relativeFilePath, content });
        } catch (readError) {
            console.warn(`Smart Search - Step 3a Warning: Skipping file ${relativeFilePath} due to read error: ${readError.message}`);
        }
    }

    if (filesWithContent.length === 0) {
        return { notFound: true, reason: "לא ניתן היה לקרוא את תוכן הקבצים שנבחרו.", filesConsideredCount: allFilesData.length, filesSelectedCount: topNRelativePaths.length, filesReadAttemptedCount: topNRelativePaths.length, filesReadSuccessCount: 0 };
    }

    // Step 3 (part 2) & Step 4: Extract answer from these contents and prepare response
    let answerResult;
    try {
        answerResult = await extractAnswerFromMultipleContents(filesWithContent, userQuery, model, apiKey);
    } catch (error) { 
        console.error("Smart Search - Step 3b Error (extractAnswerFromMultipleContents):", error);
        return { notFound: true, reason: `שגיאה בשלב 3: ניתוח תוכן הקבצים. ${error.message}`, filesConsideredCount: allFilesData.length, filesSelectedCount: topNRelativePaths.length, filesReadCount: filesWithContent.length };
    }

    if (answerResult && answerResult.found) {
        // Successfully found an answer
        return {
            quote: answerResult.quote,
            sourceFile: answerResult.sourceFile,
            lineNumber: answerResult.lineNumber,
            found: true,
            // Optional debug/info:
            // _debug: {
            //     filesConsideredCount: allFilesData.length,
            //     filesSelectedByAI: topNRelativePaths,
            //     filesAnalyzedForContent: filesWithContent.map(f => f.filePath)
            // }
        };
    } else {
        // No answer found or an error occurred during extraction
        const reason = (answerResult && answerResult.error) ? `שגיאה בניתוח התוכן: ${answerResult.error}` : "לא נמצאה תשובה מתאימה בקבצים שנסרקו.";
        return {
            notFound: true,
            reason: reason,
            // Optional debug/info:
            // _debug: {
            //     filesConsideredCount: allFilesData.length,
            //     filesSelectedByAI: topNRelativePaths,
            //     filesAnalyzedForContent: filesWithContent.map(f => f.filePath),
            //     aiExtractionError: answerResult ? answerResult.error : "Unknown extraction issue"
            // }
        };
    }
}

/**
 * פונקציה לארגון טקסט באמצעות בינה מלאכותית
 * @param {string} text - הטקסט לארגון
 * @param {string} prompt - הפרומפט להנחיית הבינה המלאכותית
 * @param {string} model - מודל הבינה המלאכותית
 * @param {string} apiKey - מפתח API
 * @returns {Promise<string>} - הטקסט המאורגן
 */
async function organizeText(text, prompt, model = 'gpt-4', apiKey) {
    if (!text || !text.trim()) {
        throw new Error('שגיאה: נדרש טקסט לארגון');
    }

    // בדיקה איזה סוג מודל זה (OpenAI או Google)
    const isGoogleModel = model && (model.includes('gemini') || model.includes('palm'));
    
    try {
        let organizedText;
        
        if (isGoogleModel) {
            organizedText = await callGoogleAIForTextOrganization(text, prompt, model, apiKey);
        } else {
            organizedText = await callOpenAIForTextOrganization(text, prompt, model, apiKey);
        }
        
        return organizedText;
    } catch (error) {
        console.error('שגיאה בארגון טקסט:', error);
        throw new Error(`שגיאה בארגון הטקסט: ${error.message}`);
    }
}

/**
 * קריאה ל-OpenAI לארגון טקסט
 */
async function callOpenAIForTextOrganization(text, prompt, model, apiKey) {
    const systemPrompt = prompt || `
אתה עוזר מקצועי לעיצוב וארגון מסמכי Markdown. 
המשימה שלך היא לארגן את הטקסט הבא בצורה מובנית וקריאה:
1. ארגן כותרות בהיררכיה ברורה
2. חלק לפסקאות לוגיות
3. שפר את הקריאות והזרימה
4. שמור על כל התוכן המקורי
5. השתמש בפורמט Markdown מתאים
6. החזר רק את הטקסט המאורגן ללא הסברים נוספים
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API שגיאה: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
    } else {
        throw new Error('תגובה לא תקינה מ-OpenAI API');
    }
}

/**
 * קריאה ל-Google AI לארגון טקסט
 */
async function callGoogleAIForTextOrganization(text, prompt, model, apiKey) {
    const systemPrompt = prompt || `
אתה עוזר מקצועי לעיצוב וארגון מסמכי Markdown. 
המשימה שלך היא לארגן את הטקסט הבא בצורה מובנית וקריאה:
1. ארגן כותרות בהיררכיה ברורה
2. חלק לפסקאות לוגיות
3. שפר את הקריאות והזרימה
4. שמור על כל התוכן המקורי
5. השתמש בפורמט Markdown מתאים
6. החזר רק את הטקסט המאורגן ללא הסברים נוספים

הטקסט לארגון:
${text}
`;

    const url = `${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`;
    
    // Use node-fetch with custom agent for SSL issues
    const fetch = require('node-fetch');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: systemPrompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4000
            }
        }),
        agent: httpsAgent // Use our custom agent
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI API שגיאה: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text.trim();
    } else {
        throw new Error('תגובה לא תקינה מ-Google AI API');
    }
}

module.exports = {
    performSmartSearch,
    organizeText,
    // Exporting for potential testing or advanced use, not strictly required by the main flow.
    // getAllTextFilePathsWithAbsolute,
    // selectTopNFilesWithAI, // Renamed
    // extractAnswerFromMultipleContents
};

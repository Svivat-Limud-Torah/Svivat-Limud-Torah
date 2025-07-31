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
 * Utility function to clean AI responses and extract valid JSON
 * @param {string} responseText - The raw response text from AI
 * @returns {string} - Cleaned JSON string ready for parsing
 */
function cleanAIResponseForJSON(responseText) {
    if (!responseText || typeof responseText !== 'string') {
        throw new Error('Invalid response text provided');
    }
    
    let cleaned = responseText.trim();
    
    // Remove markdown code blocks (various formats)
    cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/i, '');
    
    // Remove any leading/trailing quotes or backticks that might wrap the JSON
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    
    // Remove extra whitespace and newlines at start/end
    cleaned = cleaned.trim();
    
    // If the response contains explanatory text before/after JSON, try to extract just the JSON part
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    
    return cleaned;
}

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
        // Clean the response more thoroughly to handle various markdown formats
        const cleanedResponse = cleanAIResponseForJSON(textResponse);
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
        // Clean the response more thoroughly to handle various markdown formats
        const cleanedResponse = cleanAIResponseForJSON(textResponse);
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

    const startTime = Date.now();
    
    // בדיקה איזה סוג מודל זה (OpenAI או Google)
    const isGoogleModel = model && (model.includes('gemini') || model.includes('palm'));
    
    try {
        const lines = text.split('\n');
        console.log(`התחלת ארגון טקסט - מספר שורות: ${lines.length}, מודל: ${model}`);
        
        // גישה חדשה: תמיד נשלח את הטקסט המלא עם הגדרות מותאמות
        console.log('מארגן טקסט בגישה חדשה - טקסט מלא עם הגדרות מותאמות');
        
        let organizedText;
        
        if (isGoogleModel) {
            organizedText = await callGoogleAIForTextOrganizationOptimized(text, prompt, model, apiKey, lines.length);
        } else {
            organizedText = await callOpenAIForTextOrganizationOptimized(text, prompt, model, apiKey, lines.length);
        }
        
        const endTime = Date.now();
        console.log(`ארגון טקסט הושלם בתוך ${(endTime - startTime) / 1000} שניות`);
        
        // בדיקה סופית לוודא שהטקסט המאורגן שלם
        const originalLines = text.split('\n').filter(line => line.trim().length > 0);
        const organizedLines = organizedText.split('\n').filter(line => line.trim().length > 0);
        
        console.log(`בדיקה סופית: שורות במקור: ${originalLines.length}, שורות מאורגנות: ${organizedLines.length}`);
        
        // אם יש הפרש גדול בשורות, תן אזהרה
        if (organizedLines.length < originalLines.length * 0.8) {
            console.warn(`⚠️ אזהרה סופית: מספר השורות המאורגנות (${organizedLines.length}) קטן משמעותית ממספר השורות המקוריות (${originalLines.length})`);
        }
        
        return organizedText;
        
    } catch (error) {
        const endTime = Date.now();
        console.error(`שגיאה בארגון טקסט אחרי ${(endTime - startTime) / 1000} שניות:`, error);
        throw new Error(`שגיאה בארגון הטקסט: ${error.message}`);
    }
}

/**
 * קריאה ל-OpenAI לארגון טקסט - גרסה מותאמת לטקסטים גדולים
 */
async function callOpenAIForTextOrganizationOptimized(text, prompt, model, apiKey, lineCount) {
    const systemPrompt = prompt || `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט שהמשתמש יספק בהודעה הבאה.

🔥 CRITICAL - חוקים שאסור לעבור עליהם:
• שמור על כל התוכן המקורי ללא יוצא מהכלל - כולל השורות האחרונות!
• אל תמחק, תקצר, או תחסיר שום מידע מהטקסט המקורי
• אל תחתוך את הטקסט באמצע או בסוף - הכל חייב להישמר
• ודא שהטקסט המאורגן מכיל בדיוק את כל המילים והמשפטים מהמקור
• השורות האחרונות בטקסט המקורי חייבות להופיע גם בטקסט המאורגן
• אל תחליף את התוכן בנושא אחר - רק ארגן את מה שכבר קיים!
• אסור לך ליצור תוכן חדש על תיקון מידות או נושאים אחרים!

⚠️ אזהרה חשובה: 
המשתמש רוצה לארגן את הטקסט שלו, לא לקבל תוכן חדש על נושא אחר!
אל תחליף את התוכן המקורי בתוכן על נושאים כמו תיקון מידות או כל נושא אחר!

📋 משימות הארגון:
1. ארגן כותרות בהיררכיה ברורה (H1, H2, H3) על פי התוכן הקיים
2. חלק לפסקאות לוגיות ומובנות את התוכן הקיים
3. שפר את הקריאות והזרימה של הטקסט הקיים
4. השתמש בפורמט Markdown מתאים (כותרות, רשימות, הדגשות)
5. ארגן רשימות בצורה מסודרת
6. אל תחזור על תוכן - כל חלק צריך להופיע פעם אחת בלבד
7. וודא שכל השורות האחרונות נכללות במלואן

החזר אך ורק את הטקסט המאורגן המלא ללא הסברים נוספים, חתכים או קיצורים.
🚨 חשוב מאוד: שמור על כל התוכן במלואו! אל תחתוך או תקצר שום דבר!
🚨 זכור: המטרה היא לארגן את הטקסט שהמשתמש יספק, לא ליצור תוכן חדש!
🚨 הקפד במיוחד על השורות האחרונות - הן חייבות להיכלל במלואן!

הטקסט לארגון (${lineCount} שורות, ${text.length} תווים):
---
${text}
---

אנא ארגן את הטקסט שלמעלה במלואו. חשוב: שמור על כל התוכן, כולל השורות האחרונות:
${text.split('\n').slice(-3).join('\n')}

תן דעתך במיוחד לשמור על השורות האחרונות הללו!`;

    // הגדרות מותאמות לגודל הטקסט - הגדלת הטוקנים משמעותית לטקסטים גדולים
    // חישוב דינמי של maxTokens בהתבסס על גודל הטקסט בפועל
    const textTokensEstimate = Math.ceil(text.length / 3); // הערכה גסה של מספר טוקנים בטקסט
    const minOutputTokens = textTokensEstimate * 1.5; // לפחות 150% מהטקסט המקורי
    const maxTokens = Math.max(minOutputTokens, lineCount > 500 ? 60000 : lineCount > 300 ? 45000 : lineCount > 200 ? 35000 : lineCount > 100 ? 25000 : 15000);
    
    console.log(`OpenAI: שורות: ${lineCount}, טוקנים משוערים בטקסט: ${textTokensEstimate}, maxTokens: ${maxTokens}`);
    
    const isLargeText = lineCount > 100;

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
                    content: `אנא ארגן את הטקסט הבא (${lineCount} שורות). שמור על כל התוכן המקורי ורק ארגן אותו:

${text}`
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.1, // נמוך יותר לעקביות
            top_p: 0.9,
            frequency_penalty: 0.3, // מונע חזרות
            presence_penalty: 0.1,
            ...(isLargeText && {
                stream: false, // וודא שאין streaming לטקסטים גדולים
                timeout: 300000 // 5 דקות timeout במקום 2
            })
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API שגיאה: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
        const organizedText = data.choices[0].message.content.trim();
        
        // בדיקת אימות משופרת שהתוכן לא נחתך
        const originalWords = text.split(/\s+/).filter(word => word.length > 0).length;
        const organizedWords = organizedText.split(/\s+/).filter(word => word.length > 0).length;
        const wordsRatio = organizedWords / originalWords;
        
        // בדיקת אורך הטקסט גם בתווים
        const originalChars = text.replace(/\s/g, '').length;
        const organizedChars = organizedText.replace(/\s/g, '').length;
        const charsRatio = organizedChars / originalChars;
        
        console.log(`אימות תוכן: מילים במקור: ${originalWords}, מילים מאורגנות: ${organizedWords}, יחס מילים: ${(wordsRatio * 100).toFixed(1)}%`);
        console.log(`אימות תוכן: תווים במקור: ${originalChars}, תווים מאורגנים: ${organizedChars}, יחס תווים: ${(charsRatio * 100).toFixed(1)}%`);
        
        // אם יחס המילים או התווים נמוך מדי, זה יכול להצביע על חיתוך
        if (wordsRatio < 0.85 || charsRatio < 0.85) {
            console.warn(`⚠️ אזהרה: הטקסט המאורגן נראה קצר משמעותית מהמקור - מילים: ${(wordsRatio * 100).toFixed(1)}%, תווים: ${(charsRatio * 100).toFixed(1)}%`);
            
            // בדיקה האם השורות האחרונות מהטקסט המקורי מופיעות בטקסט המאורגן
            const originalLines = text.split('\n').filter(line => line.trim().length > 0);
            const lastOriginalLines = originalLines.slice(-3).map(line => line.trim()); // 3 השורות האחרונות
            
            let missingLastLines = 0;
            for (const lastLine of lastOriginalLines) {
                if (lastLine.length > 5 && !organizedText.includes(lastLine)) { // בדיקה רק לשורות משמעותיות
                    missingLastLines++;
                    console.warn(`⚠️ שורה אחרונה חסרה: "${lastLine}"`);
                }
            }
            
            if (missingLastLines > 0) {
                console.error(`❌ שגיאה: ${missingLastLines} מהשורות האחרונות חסרות בטקסט המאורגן!`);
                // אל תזרוק שגיאה - פשוט תן אזהרה והחזר את התוצאה
            }
        }
        
        return organizedText;
    } else {
        throw new Error('תגובה לא תקינה מ-OpenAI API');
    }
}

/**
 * קריאה ל-Google AI לארגון טקסט - גרסה מותאמת לטקסטים גדולים
 */
async function callGoogleAIForTextOrganizationOptimized(text, prompt, model, apiKey, lineCount) {
    const combinedPrompt = (prompt || `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט שאספק לך.

🔥 CRITICAL - חוקים שאסור לעבור עליהם:
• שמור על כל התוכן המקורי ללא יוצא מהכלל - כולל השורות האחרונות!
• אל תמחק, תקצר, או תחסיר שום מידע מהטקסט המקורי
• אל תחתוך את הטקסט באמצע או בסוף - הכל חייב להישמר
• ודא שהטקסט המאורגן מכיל בדיוק את כל המילים והמשפטים מהמקור
• השורות האחרונות בטקסט המקורי חייבות להופיע גם בטקסט המאורגן
• אל תחליף את התוכן בנושא אחר - רק ארגן את מה שכבר קיים!
• אסור לך ליצור תוכן חדש על תיקון מידות או נושאים אחרים!

⚠️ אזהרה חשובה: 
המשתמש רוצה לארגן את הטקסט שלו, לא לקבל תוכן חדש על נושא אחר!
אל תחליף את התוכן המקורי בתוכן על נושאים כמו תיקון מידות או כל נושא אחר!

📋 משימות הארגון:
1. ארגן כותרות בהיררכיה ברורה (H1, H2, H3) על פי התוכן הקיים
2. חלק לפסקאות לוגיות ומובנות את התוכן הקיים
3. שפר את הקריאות והזרימה של הטקסט הקיים
4. השתמש בפורמט Markdown מתאים (כותרות, רשימות, הדגשות)
5. ארגן רשימות בצורה מסודרת
6. אל תחזור על תוכן - כל חלק צריך להופיע פעם אחת בלבד
7. וודא שכל השורות האחרונות נכללות במלואן

החזר אך ורק את הטקסט המאורגן המלא ללא הסברים נוספים, חתכים או קיצורים.
🚨 חשוב מאוד: שמור על כל התוכן במלואו! אל תחתוך או תקצר שום דבר!
🚨 זכור: המטרה היא לארגן את הטקסט הקיים, לא ליצור תוכן חדש!
🚨 הקפד במיוחד על השורות האחרונות - הן חייבות להיכלל במלואן!
`) + `

הטקסט לארגון (${lineCount} שורות, ${text.length} תווים):
---
${text}
---

אנא ארגן את הטקסט שלמעלה במלואו. חשוב: שמור על כל התוכן, כולל השורות האחרונות:
${text.split('\n').slice(-3).join('\n')}

תן דעתך במיוחד לשמור על השורות האחרונות הללו!`;

    // הגדרות מותאמות לגודל הטקסט - הגדלת הטוקנים משמעותית לטקסטים גדולים
    // חישוב דינמי של maxTokens בהתבסס על גודל הטקסט בפועל
    const textTokensEstimate = Math.ceil(text.length / 3); // הערכה גסה של מספר טוקנים בטקסט
    const minOutputTokens = textTokensEstimate * 1.5; // לפחות 150% מהטקסט המקורי
    const maxTokens = Math.max(minOutputTokens, lineCount > 500 ? 60000 : lineCount > 300 ? 45000 : lineCount > 200 ? 35000 : lineCount > 100 ? 25000 : 15000);
    
    console.log(`Google AI: שורות: ${lineCount}, טוקנים משוערים בטקסט: ${textTokensEstimate}, maxTokens: ${maxTokens}`);

    const url = `${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`;
    
    const fetch = require('node-fetch');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: combinedPrompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1, // נמוך יותר לעקביות
                maxOutputTokens: maxTokens,
                topP: 0.9,
                topK: 40,
                candidateCount: 1, // רק מועמד אחד
                stopSequences: [] // אל תעצור באמצע
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        }),
        agent: httpsAgent,
        timeout: 300000 // 5 דקות timeout במקום 2
    });

    let responseText;
    try {
        responseText = await response.text();
    } catch (textError) {
        console.error('Failed to read response text:', textError);
        throw new Error(`שגיאה בקריאת תשובת Google AI API: ${textError.message}`);
    }

    if (!response.ok) {
        console.error(`Google AI API Error: ${response.status} - ${responseText}`);
        
        // Try to parse error as JSON for better error details
        let errorDetails = responseText;
        try {
            const errorData = JSON.parse(responseText);
            errorDetails = errorData.error?.message || responseText;
        } catch (parseError) {
            // If we can't parse as JSON, use the raw text
            console.warn('Could not parse error response as JSON:', parseError);
        }
        
        throw new Error(`Google AI API שגיאה: ${response.status} - ${errorDetails}`);
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (jsonError) {
        console.error('Failed to parse response as JSON. Raw response:', responseText);
        throw new Error(`שגיאה בפיענוח תשובת Google AI API: התקבלה תשובה לא תקינה. ייתכן שהמפתח API לא תקין או שיש בעיית רשת.`);
    }
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const organizedText = data.candidates[0].content.parts[0].text.trim();
        
        // בדיקת אימות משופרת שהתוכן לא נחתך
        const originalWords = text.split(/\s+/).filter(word => word.length > 0).length;
        const organizedWords = organizedText.split(/\s+/).filter(word => word.length > 0).length;
        const wordsRatio = organizedWords / originalWords;
        
        // בדיקת אורך הטקסט גם בתווים
        const originalChars = text.replace(/\s/g, '').length;
        const organizedChars = organizedText.replace(/\s/g, '').length;
        const charsRatio = organizedChars / originalChars;
        
        console.log(`אימות תוכן Google AI: מילים במקור: ${originalWords}, מילים מאורגנות: ${organizedWords}, יחס מילים: ${(wordsRatio * 100).toFixed(1)}%`);
        console.log(`אימות תוכן Google AI: תווים במקור: ${originalChars}, תווים מאורגנים: ${organizedChars}, יחס תווים: ${(charsRatio * 100).toFixed(1)}%`);
        
        // אם יחס המילים או התווים נמוך מדי, זה יכול להצביע על חיתוך
        if (wordsRatio < 0.85 || charsRatio < 0.85) {
            console.warn(`⚠️ אזהרה: הטקסט המאורגן נראה קצר משמעותית מהמקור - מילים: ${(wordsRatio * 100).toFixed(1)}%, תווים: ${(charsRatio * 100).toFixed(1)}%`);
            
            // בדיקה האם השורות האחרונות מהטקסט המקורי מופיעות בטקסט המאורגן
            const originalLines = text.split('\n').filter(line => line.trim().length > 0);
            const lastOriginalLines = originalLines.slice(-3).map(line => line.trim()); // 3 השורות האחרונות
            
            let missingLastLines = 0;
            for (const lastLine of lastOriginalLines) {
                if (lastLine.length > 5 && !organizedText.includes(lastLine)) { // בדיקה רק לשורות משמעותיות
                    missingLastLines++;
                    console.warn(`⚠️ שורה אחרונה חסרה: "${lastLine}"`);
                }
            }
            
            if (missingLastLines > 0) {
                console.error(`❌ שגיאה: ${missingLastLines} מהשורות האחרונות חסרות בטקסט המאורגן!`);
                // אל תזרוק שגיאה - פשוט תן אזהרה והחזר את התוצאה
            }
        }
        
        return organizedText;
    } else {
        throw new Error('תגובה לא תקינה מ-Google AI API');
    }
}

/**
 * מחלק טקסט גדול לחלקים קטנים יותר בצורה חכמה ומהירה
 */
async function divideTextIntoChunks(text, model, apiKey) {
    const lines = text.split('\n');
    if (lines.length <= 80) {
        return [text]; // אם הטקסט קטן מ-80 שורות, החזר אותו כפי שהוא
    }

    console.log(`מתחיל חלוקה חכמה של טקסט עם ${lines.length} שורות`);
    
    // שלב 1: חלוקה מהירה לפי כותרות
    const smartChunks = divideByHeaders(lines);
    
    // שלב 2: אם יש חלקים גדולים מדי, חלק אותם עוד יותר
    const finalChunks = [];
    for (const chunk of smartChunks) {
        const chunkLines = chunk.split('\n');
        if (chunkLines.length <= 80) {
            finalChunks.push(chunk);
        } else {
            // חלק חלק גדול לחלקים קטנים יותר
            const subChunks = divideTextByLines(chunk, 70); // 70 במקום 80 כדי להשאיר מקום לחפיפה
            finalChunks.push(...subChunks);
        }
    }
    
    console.log(`הטקסט חולק ל-${finalChunks.length} חלקים`);
    return finalChunks;
}

/**
 * חלוקה חכמה של טקסט לפי כותרות
 */
function divideByHeaders(lines) {
    const chunks = [];
    let currentChunk = [];
    let linesInCurrentChunk = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // בדיקה אם השורה היא כותרת (מתחילה ב-# או מכילה מילות מפתח של כותרות)
        const isHeader = isHeaderLine(line, i > 0 ? lines[i-1] : '', i < lines.length - 1 ? lines[i+1] : '');
        
        // אם מצאנו כותרת והחלק הנוכחי מכיל יותר מ-40 שורות, התחל חלק חדש
        if (isHeader && linesInCurrentChunk > 40 && currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [];
            linesInCurrentChunk = 0;
        }
        
        // אם החלק הנוכחי מכיל יותר מ-80 שורות, חתוך אותו כפות
        if (linesInCurrentChunk >= 80) {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [];
            linesInCurrentChunk = 0;
        }
        
        currentChunk.push(lines[i]);
        linesInCurrentChunk++;
    }
    
    // הוסף את החלק האחרון
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }
    
    return chunks;
}

/**
 * בדיקה אם שורה היא כותרת
 */
function isHeaderLine(line, prevLine, nextLine) {
    if (!line || line.length === 0) return false;
    
    // כותרות Markdown
    if (line.startsWith('#')) return true;
    
    // כותרות עם מילות מפתח נפוצות
    const headerKeywords = [
        'פרק', 'חלק', 'סעיף', 'סימן', 'הלכה', 'משנה', 'גמרא', 'רש"י', 'תוספות',
        'שאלה', 'תשובה', 'מבוא', 'הקדמה', 'סיכום', 'סיום', 'ביאור', 'פירוש',
        'נושא', 'עניין', 'דיון', 'הסבר', 'הערה', 'הארה', 'חידוש', 'דקדוק'
    ];
    
    for (const keyword of headerKeywords) {
        if (line.includes(keyword) && (line.length < 100 || line.endsWith(':'))) {
            return true;
        }
    }
    
    // שורה קצרה שמסתיימת בנקודתיים
    if (line.endsWith(':') && line.length < 80 && !line.includes('.')) {
        return true;
    }
    
    // שורה שהיא מספר או אות בלבד (כותרת מסוג "א. " או "1. ")
    if (/^\s*[א-ת]\.\s*$|^\s*\d+\.\s*$/.test(line)) {
        return true;
    }
    
    return false;
}

/**
 * חלוקה פשוטה של טקסט לפי מספר שורות (כפתרון גיבוי) - משופרת
 */
function divideTextByLines(text, maxLines) {
    const lines = text.split('\n');
    const chunks = [];
    
    let currentChunk = [];
    for (let i = 0; i < lines.length; i++) {
        currentChunk.push(lines[i]);
        
        // אם הגענו לגבול השורות
        if (currentChunk.length >= maxLines) {
            // נסה לחתוך במקום טוב (שורה ריקה או כותרת)
            let cutPoint = currentChunk.length;
            for (let j = currentChunk.length - 1; j >= Math.max(0, currentChunk.length - 10); j--) {
                const line = currentChunk[j].trim();
                // אם מצאנו שורה ריקה או כותרת, חתוך שם
                if (line === '' || line.startsWith('#') || line.endsWith(':')) {
                    cutPoint = j + 1;
                    break;
                }
            }
            
            // חתוך את החלק הנוכחי
            const chunkToAdd = currentChunk.slice(0, cutPoint).join('\n');
            chunks.push(chunkToAdd);
            
            // התחל חלק חדש עם השורות שנותרו
            currentChunk = currentChunk.slice(cutPoint);
        }
    }
    
    // הוסף את השארית
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }
    
    return chunks;
}

/**
 * קריאה ל-Google AI לארגון טקסט
 */
async function callGoogleAIForTextOrganization(text, prompt, model, apiKey) {
    const systemPrompt = prompt || `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט הספציפי שהמשתמש סיפק ולא ליצור תוכן חדש.

🔥 CRITICAL - חוקים שאסור לעבור עליהם:
• שמור על כל התוכן המקורי ללא יוצא מהכלל
• אל תמחק, תקצר, או תחסיר שום מידע מהטקסט המקורי
• אל תחליף את התוכן בנושא אחר - רק ארגן את מה שכבר קיים!
• אסור לך ליצור תוכן חדש על תיקון מידות או נושאים אחרים!

⚠️ אזהרה חשובה: 
המשתמש רוצה לארגן את הטקסט שלו, לא לקבל תוכן חדש על נושא אחר!
אל תחליף את התוכן המקורי בתוכן על נושאים כמו תיקון מידות או כל נושא אחר!

📋 משימות הארגון:
1. ארגן כותרות בהיררכיה ברורה על פי התוכן הקיים למטה
2. חלק לפסקאות לוגיות את התוכן הקיים למטה
3. שפר את הקריאות והזרימה של הטקסט הקיים למטה
4. שמור על כל התוכן המקורי
5. השתמש בפורמט Markdown מתאים
6. החזר רק את הטקסט המאורגן ללא הסברים נוספים
7. אל תשנה את הנושא או התוכן - רק ארגן אותו!

הטקסט לארגון:
${text}

🚨 זכור: המטרה היא לארגן את הטקסט הקיים למעלה, לא ליצור תוכן חדש!
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

    let responseText;
    try {
        responseText = await response.text();
    } catch (textError) {
        console.error('Failed to read response text:', textError);
        throw new Error(`שגיאה בקריאת תשובת Google AI API: ${textError.message}`);
    }

    if (!response.ok) {
        console.error(`Google AI API Error: ${response.status} - ${responseText}`);
        
        // Try to parse error as JSON for better error details
        let errorDetails = responseText;
        try {
            const errorData = JSON.parse(responseText);
            errorDetails = errorData.error?.message || responseText;
        } catch (parseError) {
            // If we can't parse as JSON, use the raw text
            console.warn('Could not parse error response as JSON:', parseError);
        }
        
        throw new Error(`Google AI API שגיאה: ${response.status} - ${errorDetails}`);
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (jsonError) {
        console.error('Failed to parse response as JSON. Raw response:', responseText);
        throw new Error(`שגיאה בפיענוח תשובת Google AI API: התקבלה תשובה לא תקינה. ייתכן שהמפתח API לא תקין או שיש בעיית רשת.`);
    }
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text.trim();
    } else {
        throw new Error('תגובה לא תקינה מ-Google AI API');
    }
}

/**
 * ניקוי וחלקות סופיים של הטקסט המאורגן
 */
function cleanAndSmooth(text) {
    // הסרת שורות ריקות מיותרות
    let cleaned = text.replace(/\n{3,}/g, '\n\n');
    
    // תיקון כותרות כפולות
    cleaned = cleaned.replace(/^(#{1,6}\s+.+)\n\1/gm, '$1');
    
    // תיקון פסקאות שנקטעו
    cleaned = cleaned.replace(/([^.!?:])\n([א-ת])/g, '$1 $2');
    
    // וידוא שכותרות מתחילות בשורה חדשה
    cleaned = cleaned.replace(/([^.\n])\n(#{1,6}\s+)/g, '$1\n\n$2');
    
    return cleaned.trim();
}

module.exports = {
    performSmartSearch,
    organizeText,
    // Exporting for potential testing or advanced use, not strictly required by the main flow.
    // getAllTextFilePathsWithAbsolute,
    // selectTopNFilesWithAI, // Renamed
    // extractAnswerFromMultipleContents
};

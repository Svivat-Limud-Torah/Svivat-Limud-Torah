// backend/services/PilpultaService.js
// Using node-fetch for making HTTP requests in Node.js
const fetch = require('node-fetch');
const https = require('https');

// Create a custom HTTPS agent that ignores SSL certificate issues
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

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

// Placeholder for constants or configuration - ideally load from a config file or env vars
const HEBREW_TEXT = {
    apiKeyNotSetError: "AI Service configuration error: API Key not found.",
    apiError: (status, statusText, details) => `AI API Error: ${status} ${statusText}. Details: ${details}`,
    invalidApiResponse: (feature) => `Invalid response structure from AI API for ${feature}.`,
    unexpectedFormat: "AI model returned data in an unexpected format.",
};

// --- Main Service Function ---
// Added apiKey parameter
async function generateQuestions(text, useWebSearch, model, apiKey) {
    console.log(`PilpultaService: Generating questions. Model: ${model}, WebSearch: ${useWebSearch}`);

    // --- API Key Validation ---
    // Use the apiKey passed from the route handler (originating from the frontend UI)
    if (!apiKey) {
        // This check might be redundant if the route handler already validates, but good for safety
        console.error("PilpultaService Error: API Key was not provided to the service function.");
        // Use a more specific error message if possible
        throw new Error("Pilpulta Service Error: API Key missing in service call.");
    }

    // --- Construct Prompt ---
    const prompt = `אתה מומחה בהלכה ובפלפול תלמודי.
נתון הטקסט הבא:
---
${text}
---
צור 5 שאלות פלפול מעמיקות המבוססות על הטקסט (אם הטקסט קצר מאוד אז מספיקות 2 שאלות - אחת מכל סוג). השאלות:
סוג ראשון - 3 ראשונות:
- להיות מאתגרות ולדרוש חשיבה ועיון.
- לחפש מקור יהודי חיצוני שמקשה על הנאמר בטקסט ולצטט בדיוק מאיפה המקור החיצוני כולל הציטוט עצמו.
- להיות מנוסחות בצורה ברורה ותמציתית.
סוג שני - 2 אחרונות:
- להיות מאתגרות ולדרוש חשיבה ועיון.
- לקשר בין מושגים שונים בטקסט או בין הטקסט למקורות אחרים (אם רלוונטי).
- להיות מנוסחות בצורה ברורה ותמציתית.
- לכלול את המקור הספציפי בטקסט שעליו מבוססת השאלה.

עצב את הפלט כמערך JSON של אובייקטים. כל אובייקט צריך להכיל מפתח "question" (השאלה עצמה) ומפתח "source" (ציטוט קצר מהטקסט המקורי המשמש כמקור לשאלה).
לדוגמה:
[
  { "question": "כיצד ניתן ליישב את דברי רש\"י כאן עם דבריו במסכת בבא קמא דף ג עמוד א?", "source": "וכתב רש\"י..." },
  { "question": "מה ההשלכה המעשית של מחלוקת זו בזמן הזה?", "source": "ונחלקו הראשונים..." }
]
ודא שהפלט הוא מערך JSON תקין בלבד, ללא טקסט נוסף לפניו או אחריו.
`;

    // --- Prepare API Request ---
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }]
        // Removed conditional grounding tool as it's not supported by the model
        // ...(useWebSearch && {
        //     tools: [{
        //         "googleSearchRetrieval": {}
        //     }]
        // })
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // --- Make API Call ---
    try {
        console.log(`PilpultaService: Calling AI API: ${apiUrl}`);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            agent: httpsAgent // Use our custom agent
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorDetails = errorText;
            try {
                const errorData = JSON.parse(errorText);
                errorDetails = errorData.error?.message || errorText;
                console.error("PilpultaService: AI API Error Response (JSON):", errorData);
            } catch (e) {
                console.error("PilpultaService: AI API Error Response (Non-JSON):", errorText);
            }
            // Throw an error that includes the status and details
            throw new Error(HEBREW_TEXT.apiError(response.status, response.statusText, errorDetails));
        }

        const data = await response.json();
        console.log("PilpultaService: Received AI API response.");

        // --- Process Response ---
        // Adjust based on actual API response structure (e.g., grounding might change it)
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            console.warn("PilpultaService: AI response did not contain a usable text part. Full response:", JSON.stringify(data, null, 2));
            throw new Error(HEBREW_TEXT.invalidApiResponse("פלפולתא"));
        }

        // Clean potential markdown/JSON markers
        const cleanedResponse = cleanAIResponseForJSON(textResponse);

        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error("PilpultaService: Failed to parse AI response JSON:", parseError);
            console.error("PilpultaService: Raw response text:", cleanedResponse);
            throw new Error(HEBREW_TEXT.unexpectedFormat);
        }


        // Validate the structure of the parsed response
        if (!Array.isArray(parsedQuestions) || !parsedQuestions.every(q => typeof q.question === 'string' && typeof q.source === 'string')) {
            console.error("PilpultaService: Parsed questions are not in the expected format [{question: string, source: string}]:", parsedQuestions);
            throw new Error(HEBREW_TEXT.unexpectedFormat);
        }

        console.log(`PilpultaService: Successfully generated ${parsedQuestions.length} questions.`);
        return parsedQuestions; // Return the array of questions

    } catch (error) {
        console.error("PilpultaService: Error during AI interaction:", error);
        // Re-throw the error with a prefix to indicate it originated from the service
        // This helps the route handler decide on the response status/message
        throw new Error(`Pilpulta Service Error: ${error.message}`);
    }
}

// --- Export Service Functions ---
module.exports = {
    generateQuestions
};

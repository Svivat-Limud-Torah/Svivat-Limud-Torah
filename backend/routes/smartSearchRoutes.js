// backend/routes/smartSearchRoutes.js
const express = require('express');
const router = express.Router();
const SmartSearchService = require('../services/SmartSearchService');
const path = require('path'); // For path validation
const fs = require('fs').promises; // For checking if path exists and is a directory

// Middleware to validate workspacePath (basic security measure)
// This should align with how baseFolderPath is validated elsewhere in your app
async function validateWorkspacePath(req, res, next) {
    const { workspacePath } = req.body;

    if (!workspacePath || typeof workspacePath !== 'string') {
        return res.status(400).json({ error: 'workspacePath is required and must be a string.' });
    }

    // Basic check: ensure it's an absolute path. More robust checks might be needed.
    // For example, ensuring it's within a list of allowed/opened workspaces if your app manages that.
    if (!path.isAbsolute(workspacePath)) {
        return res.status(400).json({ error: 'workspacePath must be an absolute path.' });
    }

    try {
        const stats = await fs.stat(workspacePath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'workspacePath must be a valid directory.' });
        }
    } catch (error) {
        console.error(`Error accessing workspacePath "${workspacePath}":`, error);
        return res.status(400).json({ error: `Invalid or inaccessible workspacePath: ${workspacePath}` });
    }
    
    // Further security: Ensure the path doesn't try to escape an expected parent directory if applicable.
    // This depends on your application's security model for workspace access.
    // For this example, we assume the path provided has been vetted by the client to some extent
    // or that the application runs in a context where access to this path is permissible.

    next();
}

router.post('/', validateWorkspacePath, async (req, res) => {
    const { query, model, apiKey, workspacePath, numFilesToScan } = req.body;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required and must be a string.' });
    }
    if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: 'AI model is required and must be a string.' });
    }
    if (!apiKey || typeof apiKey !== 'string') {
        // Consider not logging the API key or only a part of it for security.
        return res.status(400).json({ error: 'API key is required.' });
    }

    // Validate numFilesToScan if provided
    let numFilesToScanInt;
    if (numFilesToScan !== undefined) {
        numFilesToScanInt = parseInt(numFilesToScan, 10);
        if (isNaN(numFilesToScanInt) || numFilesToScanInt <= 0) {
            return res.status(400).json({ error: 'numFilesToScan must be a positive integer.' });
        }
    }
    // If numFilesToScanInt is undefined here, the service will use its default.

    try {
        // The plan mentions updating global loading messages from useAiFeatures.
        // The backend currently doesn't stream progress updates for this.
        // The frontend apiService has a placeholder for onProgressUpdate.
        // If backend were to stream, it would use res.write for Server-Sent Events or WebSockets.
        
        const results = await SmartSearchService.performSmartSearch(workspacePath, query, numFilesToScanInt, model, apiKey);
        res.json(results);
    } catch (error) {
        console.error('Error in smart search route:', error);
        // Ensure a user-friendly error message is sent.
        // Avoid exposing internal error details directly unless it's a controlled message.
        const userMessage = error.message.startsWith("שגיאה ב") ? error.message : "An unexpected error occurred during smart search.";
        res.status(500).json({ error: userMessage, details: error.stack }); // Include stack in dev for easier debugging
    }
});

// נתיב לארגון טקסט בעזרת בינה מלאכותית
router.post('/organize-text', async (req, res) => {
    const { text, prompt, model = 'gpt-4', apiKey } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text to organize is required and must be a string.' });
    }

    try {
        // נשתמש בשירות SmartSearch עם פרומפט מותאם לארגון טקסט
        const organizedText = await SmartSearchService.organizeText(text, prompt, model, apiKey);
        res.json({ organizedText });
    } catch (error) {
        console.error('Error in organize text route:', error);
        const userMessage = error.message.startsWith("שגיאה ב") ? error.message : "An unexpected error occurred during text organization.";
        res.status(500).json({ error: userMessage, details: error.stack });
    }
});

module.exports = router;

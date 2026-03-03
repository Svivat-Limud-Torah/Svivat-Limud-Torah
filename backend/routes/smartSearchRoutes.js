// backend/routes/smartSearchRoutes.js
const express = require('express');
const router = express.Router();
const SmartSearchService = require('../services/SmartSearchService');
const path = require('path');
const fs = require('fs').promises;

// Middleware to validate workspacePath
async function validateWorkspacePath(req, res, next) {
    const { workspacePath } = req.body;

    if (!workspacePath || typeof workspacePath !== 'string') {
        return res.status(400).json({ error: 'workspacePath is required and must be a string.' });
    }

    // Resolve to absolute path (handles both absolute and relative paths)
    const resolvedPath = path.resolve(workspacePath);
    req.body.workspacePath = resolvedPath;

    try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'workspacePath must be a valid directory.' });
        }
    } catch (error) {
        console.error(`Error accessing workspacePath "${resolvedPath}":`, error);
        return res.status(400).json({ error: `Invalid or inaccessible workspacePath: ${resolvedPath}` });
    }

    next();
}

// Smart Search (AI-powered)
router.post('/', async (req, res) => {
    const { query, model, workspacePath, numFilesToScan, mode, files } = req.body;
    const apiKey = req.session?.apiKey;

    // If files are provided from the browser, skip workspacePath validation
    const hasProvidedFiles = Array.isArray(files) && files.length > 0;
    if (!hasProvidedFiles) {
        // Validate workspacePath only when backend needs to read files from disk
        if (!workspacePath || typeof workspacePath !== 'string') {
            return res.status(400).json({ error: 'workspacePath is required when files are not provided.' });
        }
        const resolvedPath = path.resolve(workspacePath);
        req.body.workspacePath = resolvedPath;
        try {
            const stats = await fs.stat(resolvedPath);
            if (!stats.isDirectory()) {
                return res.status(400).json({ error: 'workspacePath must be a valid directory.' });
            }
        } catch (error) {
            return res.status(400).json({ error: `Invalid or inaccessible workspacePath: ${resolvedPath}` });
        }
    }

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required and must be a string.' });
    }
    if (mode === 'deep') {
        if (!model || typeof model !== 'string') {
            return res.status(400).json({ error: 'AI model is required and must be a string.' });
        }
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required. Please set your API key first.' });
        }
    }

    let numFilesToScanInt;
    if (numFilesToScan !== undefined) {
        numFilesToScanInt = parseInt(numFilesToScan, 10);
        if (isNaN(numFilesToScanInt) || numFilesToScanInt <= 0) {
            return res.status(400).json({ error: 'numFilesToScan must be a positive integer.' });
        }
    }

    try {
        const results = await SmartSearchService.performSmartSearch(
            hasProvidedFiles ? null : req.body.workspacePath,
            query,
            numFilesToScanInt,
            model,
            apiKey,
            mode || 'deep',
            hasProvidedFiles ? files : null
        );
        res.json(results);
    } catch (error) {
        console.error('Error in smart search route:', error);
        const userMessage = error.message.startsWith("שגיאה ב") ? error.message : "An unexpected error occurred during smart search.";
        res.status(500).json({ error: userMessage, details: error.stack });
    }
});

// Simple Text Search (no AI)
router.post('/simple', async (req, res) => {
    const { searchText, workspacePath, filterPaths, caseSensitive, wholeWord, files } = req.body;

    const hasProvidedFiles = Array.isArray(files) && files.length > 0;
    if (!hasProvidedFiles) {
        if (!workspacePath || typeof workspacePath !== 'string') {
            return res.status(400).json({ error: 'workspacePath is required when files are not provided.' });
        }
        const resolvedPath = path.resolve(workspacePath);
        req.body.workspacePath = resolvedPath;
        try {
            const stats = await fs.stat(resolvedPath);
            if (!stats.isDirectory()) {
                return res.status(400).json({ error: 'workspacePath must be a valid directory.' });
            }
        } catch (error) {
            return res.status(400).json({ error: `Invalid or inaccessible workspacePath: ${resolvedPath}` });
        }
    }

    if (!searchText || typeof searchText !== 'string') {
        return res.status(400).json({ error: 'searchText is required and must be a string.' });
    }

    try {
        const results = await SmartSearchService.performSimpleSearch(
            hasProvidedFiles ? null : req.body.workspacePath,
            searchText,
            filterPaths || null,
            !!caseSensitive,
            !!wholeWord,
            hasProvidedFiles ? files : null
        );
        res.json(results);
    } catch (error) {
        console.error('Error in simple search route:', error);
        res.status(500).json({ error: `שגיאה בחיפוש: ${error.message}` });
    }
});

// Text Organization (AI-powered)
router.post('/organize-text', async (req, res) => {
    const { text, prompt, model = 'gpt-4' } = req.body;
    const apiKey = req.session?.apiKey;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text to organize is required and must be a string.' });
    }

    try {
        const organizedText = await SmartSearchService.organizeText(text, prompt, model, apiKey);
        res.json({ organizedText });
    } catch (error) {
        console.error('Error in organize text route:', error);
        const userMessage = error.message.startsWith("שגיאה ב") ? error.message : "An unexpected error occurred during text organization.";
        res.status(500).json({ error: userMessage, details: error.stack });
    }
});

module.exports = router;

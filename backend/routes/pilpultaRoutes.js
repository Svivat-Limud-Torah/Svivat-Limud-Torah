// backend/routes/pilpultaRoutes.js
const express = require('express');
const router = express.Router();
const PilpultaService = require('../services/PilpultaService'); // Assuming service exists

// Example route (add actual routes later)
router.get('/', (req, res) => {
  res.send('Pilpulta API endpoint');
});

// Route for generating pilpulta questions
router.post('/generate', async (req, res) => {
    // Get parameters sent from frontend, including the apiKey
    const { text, useWebSearch, model, apiKey } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required to generate questions.' });
    }
    // Add validation for apiKey received from frontend
    if (!apiKey) {
        return res.status(400).json({ error: 'API Key is required.' });
    }
    try {
        // Call the service method, passing the apiKey from the request body
        const questions = await PilpultaService.generateQuestions(text, useWebSearch, model, apiKey);
        // Send the results back
        res.json(questions); // Send the array directly as expected by frontend
    } catch (error) {
        console.error('Error generating pilpulta questions:', error);
        // Check if it's an API key error to provide a more specific message
        if (error.message && error.message.toLowerCase().includes('api key not valid')) {
             return res.status(401).json({ error: 'Invalid API Key. Please check your settings.' });
        }
        res.status(500).json({ error: error.message || 'Failed to generate pilpulta questions.' });
    }
});


module.exports = router;

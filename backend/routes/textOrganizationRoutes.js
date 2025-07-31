const express = require('express');
const router = express.Router();
const textOrganizationService = require('../services/TextOrganizationProgressService');

/**
 * ארגון טקסט עם מעקב התקדמות
 * POST /api/text-organization/organize-with-progress
 */
router.post('/organize-with-progress', async (req, res) => {
    try {
        const { text, prompt, model, apiKey, disableItalicFormatting } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'נדרש טקסט לארגון' });
        }
        
        if (!apiKey) {
            return res.status(400).json({ error: 'נדרש מפתח API' });
        }

        const processId = `organize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // התחלת תהליך הארגון באופן אסינכרוני
        textOrganizationService.organizeTextWithProgress(text, prompt, model, apiKey, processId, disableItalicFormatting)
            .then(result => {
                // תוצאה תישלח דרך SSE
            })
            .catch(error => {
                console.error('שגיאה בארגון טקסט:', error);
            });
        
        res.json({ processId, status: 'started' });
        
    } catch (error) {
        console.error('שגיאה בהתחלת ארגון טקסט:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * מעקב התקדמות דרך Server-Sent Events
 * GET /api/text-organization/progress/:processId
 */
router.get('/progress/:processId', (req, res) => {
    const processId = req.params.processId;
    
    // הגדרת SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // שליחת התחברות ראשונית
    res.write('data: {"type":"connected"}\n\n');

    // מעקב אחר התקדמות
    const progressHandler = (id, processInfo) => {
        if (id === processId) {
            const progressData = {
                type: 'progress',
                processId: id,
                currentStep: processInfo.currentStep,
                totalSteps: processInfo.steps.length,
                completedSteps: processInfo.completedSteps,
                status: processInfo.status,
                steps: processInfo.steps,
                textLength: processInfo.textLength,
                model: processInfo.model,
                elapsedTime: Date.now() - processInfo.startTime,
                estimatedTimeRemaining: processInfo.estimatedDuration ? 
                    Math.max(0, processInfo.estimatedDuration - (Date.now() - processInfo.startTime)) : null
            };
            
            res.write(`data: ${JSON.stringify(progressData)}\n\n`);
        }
    };

    // מעקב אחר שגיאות
    const errorHandler = (id, error) => {
        if (id === processId) {
            const errorData = {
                type: 'error',
                processId: id,
                error: error.message
            };
            res.write(`data: ${JSON.stringify(errorData)}\n\n`);
            res.end();
        }
    };

    // מעקב אחר השלמה
    const completionHandler = (id, result) => {
        if (id === processId) {
            const completionData = {
                type: 'completed',
                processId: id,
                organizedText: result.organizedText,
                processInfo: result.processInfo
            };
            res.write(`data: ${JSON.stringify(completionData)}\n\n`);
            res.end();
        }
    };

    // רישום מאזינים
    textOrganizationService.on('progress', progressHandler);
    textOrganizationService.on('error', errorHandler);
    
    // מאזין מיוחד להשלמה - נצטרך להוסיף אותו לשירות
    textOrganizationService.on('completed', completionHandler);

    // בדיקה אם התהליך כבר קיים
    const existingProcess = textOrganizationService.getProcessInfo(processId);
    if (existingProcess) {
        progressHandler(processId, existingProcess);
        
        if (existingProcess.status === 'completed') {
            completionHandler(processId, { 
                organizedText: existingProcess.result,
                processInfo: existingProcess.processInfo 
            });
        }
    }

    // ניקוי כשהלקוח מתנתק
    req.on('close', () => {
        textOrganizationService.removeListener('progress', progressHandler);
        textOrganizationService.removeListener('error', errorHandler);
        textOrganizationService.removeListener('completed', completionHandler);
    });
});

/**
 * ביטול תהליך ארגון
 * POST /api/text-organization/cancel/:processId
 */
router.post('/cancel/:processId', (req, res) => {
    const processId = req.params.processId;
    
    try {
        textOrganizationService.cancelProcess(processId);
        res.json({ success: true, message: 'התהליך בוטל בהצלחה' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * קבלת מידע על תהליך
 * GET /api/text-organization/info/:processId
 */
router.get('/info/:processId', (req, res) => {
    const processId = req.params.processId;
    const processInfo = textOrganizationService.getProcessInfo(processId);
    
    if (!processInfo) {
        return res.status(404).json({ error: 'תהליך לא נמצא' });
    }
    
    res.json(processInfo);
});

module.exports = router;

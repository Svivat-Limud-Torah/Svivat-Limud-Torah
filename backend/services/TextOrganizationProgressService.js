/**
 * Enhanced Text Organization Service with Progress Tracking
 * Uses Server-Sent Events (SSE) to provide real-time progress updates
 */

const EventEmitter = require('events');
const { organizeText } = require('./SmartSearchService');

class TextOrganizationProgressService extends EventEmitter {
    constructor() {
        super();
        this.activeProcesses = new Map();
        this.processCounter = 0;
    }

    /**
     * ארגון טקסט עם מעקב התקדמות מלא
     */
    async organizeTextWithProgress(text, prompt, model, apiKey, processId = null, disableItalicFormatting = false) {
        if (!processId) {
            processId = `process_${++this.processCounter}_${Date.now()}`;
        }

        const lines = text.split('\n');
        const textLength = lines.length;
        
        // הגדרת שלבי העיבוד
        const steps = this.defineProcessingSteps(textLength);
        
        const processInfo = {
            id: processId,
            startTime: Date.now(),
            textLength,
            model,
            steps,
            currentStep: 0,
            completedSteps: 0,
            status: 'initializing',
            estimatedDuration: this.estimateProcessingTime(textLength, model)
        };
        
        this.activeProcesses.set(processId, processInfo);

        try {
            // שלב 1: הכנה וניתוח ראשוני
            await this.executeStep(processId, 0, async () => {
                await this.delay(500); // סימולציה של ניתוח
                return this.analyzeTextStructure(text);
            });

            // שלב 2: יצירת prompt מותאם
            const optimizedPrompt = await this.executeStep(processId, 1, async () => {
                return this.createOptimizedPrompt(text, prompt, textLength, disableItalicFormatting);
            });

            // שלב 3: קריאה ל-API עם retry logic
            const organizedText = await this.executeStep(processId, 2, async () => {
                let attempts = 0;
                const maxAttempts = 2;
                
                while (attempts < maxAttempts) {
                    attempts++;
                    try {
                        const result = await this.callAIForOrganization(text, optimizedPrompt, model, apiKey, processId);
                        
                        // בדיקה מהירה שהתוצאה לא ריקה
                        if (!result || result.trim().length < text.length * 0.3) {
                            if (attempts < maxAttempts) {
                                console.warn(`⚠️ ניסיון ${attempts}: התוצאה קצרה מדי, מנסה שוב...`);
                                await this.delay(2000); // המתנה קצרה
                                continue;
                            }
                        }
                        
                        return result;
                    } catch (error) {
                        if (attempts < maxAttempts) {
                            console.warn(`⚠️ ניסיון ${attempts} נכשל: ${error.message}. מנסה שוב...`);
                            await this.delay(3000); // המתנה ארוכה יותר
                            continue;
                        }
                        throw error;
                    }
                }
                
                throw new Error('כל הניסיונות נכשלו');
            });

            // שלב 4: עיבוד תוצאות
            const finalText = await this.executeStep(processId, 3, async () => {
                return this.postProcessText(organizedText);
            });

            // שלב 5: אימות איכות
            await this.executeStep(processId, 4, async () => {
                await this.validateTextQuality(text, finalText);
                await this.delay(300);
            });

            // השלמת העיבוד
            processInfo.status = 'completed';
            processInfo.completedSteps = steps.length;
            processInfo.endTime = Date.now();
            processInfo.duration = processInfo.endTime - processInfo.startTime;
            processInfo.result = finalText;
            processInfo.processInfo = {
                duration: processInfo.duration,
                stepsCompleted: processInfo.completedSteps,
                linesProcessed: textLength
            };
            
            this.emit('progress', processId, processInfo);
            this.emit('completed', processId, {
                organizedText: finalText,
                processInfo: processInfo.processInfo
            });
            
            return {
                organizedText: finalText,
                processInfo: {
                    duration: processInfo.duration,
                    stepsCompleted: processInfo.completedSteps,
                    linesProcessed: textLength
                }
            };

        } catch (error) {
            processInfo.status = 'error';
            processInfo.error = error.message;
            this.emit('error', processId, error);
            throw error;
        } finally {
            // ניקוי אחרי 5 דקות
            setTimeout(() => {
                this.activeProcesses.delete(processId);
            }, 5 * 60 * 1000);
        }
    }

    /**
     * הגדרת שלבי העיבוד בהתאם לגודל הטקסט
     */
    defineProcessingSteps(textLength) {
        return [
            {
                title: 'הכנה וניתוח ראשוני',
                description: 'ניתוח מבנה הטקסט וחלוקה לקטעים',
                subSteps: ['זיהוי כותרות קיימות', 'ניתוח מבנה פסקאות', 'חלוקה חכמה לקטעים']
            },
            {
                title: 'הכנת אסטרטגיית ארגון',
                description: 'הכנת הקטעים לעיבוד',
                subSteps: ['קביעת גבולות קטעים', 'הגדרת פרמטרים למודל AI']
            },
            {
                title: 'עיבוד קטע-קטע בבינה מלאכותית',
                description: 'שליחת כל קטע בנפרד — מבנה בלבד, ללא סיכום',
                subSteps: ['שליחת קטע למודל', 'קבלת קטע מאורגן', 'חיבור קטעים']
            },
            {
                title: 'עיבוד ושיפור תוצאות',
                description: 'ניקוי ושיפור הטקסט המאורגן',
                subSteps: ['ניקוי פורמט', 'תיקון שורות ריקות']
            },
            {
                title: 'אימות איכות וסיום',
                description: 'בדיקה שכל התוכן נשמר',
                subSteps: ['אימות שלמות', 'הכנה להחזרה']
            }
        ];
    }

    /**
     * הערכת זמן עיבוד
     */
    estimateProcessingTime(textLength, model) {
        // הערכה בסיסית בהתבסס על גודל הטקסט ומודל
        let baseTime = 3000; // 3 שניות בסיס
        
        if (textLength > 100) baseTime += (textLength - 100) * 50; // 50ms לכל שורה נוספת
        if (textLength > 200) baseTime += (textLength - 200) * 30; // זמן נוסף לטקסטים גדולים
        
        // התאמה למודל
        if (model && model.includes('2.5-pro')) {
            baseTime *= 1.3; // מודל חזק יותר = זמן יותר
        }
        
        return Math.min(baseTime, 120000); // מקסימום 2 דקות
    }

    /**
     * ביצוע שלב עם מעקב התקדמות
     */
    async executeStep(processId, stepIndex, stepFunction) {
        const processInfo = this.activeProcesses.get(processId);
        if (!processInfo) throw new Error('Process not found');

        processInfo.currentStep = stepIndex;
        processInfo.steps[stepIndex].status = 'active';
        processInfo.steps[stepIndex].startTime = Date.now();
        
        this.emit('progress', processId, processInfo);

        try {
            const result = await stepFunction();
            
            processInfo.steps[stepIndex].status = 'completed';
            processInfo.steps[stepIndex].endTime = Date.now();
            processInfo.completedSteps = stepIndex + 1;
            
            this.emit('progress', processId, processInfo);
            
            return result;
        } catch (error) {
            processInfo.steps[stepIndex].status = 'error';
            processInfo.steps[stepIndex].error = error.message;
            throw error;
        }
    }

    /**
     * ניתוח מבנה הטקסט
     */
    async analyzeTextStructure(text) {
        await this.delay(200);
        
        const lines = text.split('\n');
        const analysis = {
            totalLines: lines.length,
            hasHeaders: /^#{1,6}\s/.test(text),
            hasLists: /^[\s]*[-*+]\s/.test(text) || /^[\s]*\d+\.\s/.test(text),
            hasBoldText: /\*\*.*\*\*/.test(text) || /__.*__/.test(text),
            hasItalicText: /\*.*\*/.test(text) || /_.*_/.test(text),
            paragraphs: text.split('\n\n').length,
            avgLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length
        };
        
        return analysis;
    }

    /**
     * יצירת prompt מותאם — מבנה בלבד, ללא סיכום
     */
    async createOptimizedPrompt(text, basePrompt, textLength, disableItalicFormatting = false) {
        await this.delay(300);
        // הפונקציה organizeText ב-SmartSearchService בונה את ה-prompt לכל קטע בעצמה.
        // כאן אנחנו מחזירים null כדי לאפשר לה לבחור את ה-prompt הנכון.
        return null;
    }

    /**
     * קריאה לבינה מלאכותית עם מעקב התקדמות
     */
    async callAIForOrganization(text, prompt, model, apiKey, processId) {
        const processInfo = this.activeProcesses.get(processId);

        if (processInfo) {
            processInfo.steps[processInfo.currentStep].currentOperation = 'מחלק את הטקסט לקטעים ומעבד בנפרד...';
            this.emit('progress', processId, processInfo);
        }

        // callback שיקרא על כל קטע — מעדכן את ה-step הנוכחי
        const onChunkProgress = (doneChunks, totalChunks) => {
            if (processInfo) {
                processInfo.steps[processInfo.currentStep].currentOperation =
                    `מעבד קטע ${doneChunks + 1} מתוך ${totalChunks}...`;
                this.emit('progress', processId, processInfo);
            }
        };

        try {
            const organizedText = await organizeText(text, prompt, model, apiKey, onChunkProgress);

            if (processInfo) {
                processInfo.steps[processInfo.currentStep].currentOperation = 'קיבל תגובה בהצלחה';
                this.emit('progress', processId, processInfo);
            }

            return organizedText;
        } catch (error) {
            if (processInfo) {
                processInfo.steps[processInfo.currentStep].currentOperation = `שגיאה: ${error.message}`;
                this.emit('progress', processId, processInfo);
            }
            throw error;
        }
    }

    /**
     * עיבוד תוצאות
     */
    async postProcessText(organizedText) {
        await this.delay(400);
        
        let processedText = organizedText;
        
        // ניקוי שורות ריקות מיותרות
        processedText = processedText.replace(/\n{3,}/g, '\n\n');
        
        // תיקון רווחים מיותרים
        processedText = processedText.replace(/[ \t]+$/gm, '');
        
        // וידוא שהטקסט מסתיים בשורה חדשה
        if (!processedText.endsWith('\n')) {
            processedText += '\n';
        }
        
        return processedText;
    }

    /**
     * אימות איכות הטקסט - גרסה משופרת
     */
    async validateTextQuality(originalText, organizedText) {
        await this.delay(200);
        
        const originalWords = originalText.split(/\s+/).filter(word => word.length > 0).length;
        const organizedWords = organizedText.split(/\s+/).filter(word => word.length > 0).length;
        const wordsRatio = organizedWords / originalWords;
        
        // בדיקת תווים (ללא רווחים)
        const originalChars = originalText.replace(/\s/g, '').length;
        const organizedChars = organizedText.replace(/\s/g, '').length;
        const charsRatio = organizedChars / originalChars;
        
        // בדיקת שורות משמעותיות
        const originalLines = originalText.split('\n').filter(line => line.trim().length > 0);
        const organizedLines = organizedText.split('\n').filter(line => line.trim().length > 0);
        const linesRatio = organizedLines.length / originalLines.length;
        
        // בדיקה שלא אבד תוכן משמעותי
        const isValid = wordsRatio >= 0.8 && charsRatio >= 0.8 && linesRatio >= 0.6;
        
        // בדיקה מיוחדת לשורות אחרונות - גרסה משופרת
        let lastLinesPresent = true;
        let missingLastLines = [];
        if (originalLines.length >= 3) {
            const lastOriginalLines = originalLines.slice(-3).map(line => line.trim());
            
            for (const lastLine of lastOriginalLines) {
                if (lastLine.length > 10) { // רק שורות משמעותיות
                    // בדיקה גמישה יותר - גם חלק מהשורה
                    const lineWords = lastLine.split(/\s+/).filter(w => w.length > 2);
                    const wordsFound = lineWords.filter(word => organizedText.includes(word));
                    
                    if (wordsFound.length < lineWords.length * 0.5) { // אם פחות מ-50% מהמילים נמצאו
                        missingLastLines.push(lastLine);
                        console.warn(`⚠️ שורה אחרונה חסרה: "${lastLine}"`);
                    }
                }
            }
            
            if (missingLastLines.length > 0) {
                lastLinesPresent = false;
                console.error(`❌ שגיאה: ${missingLastLines.length} מהשורות האחרונות חסרות בטקסט המאורגן!`);
            }
        }
        
        if (!isValid || !lastLinesPresent) {
            console.warn(`⚠️ אימות איכות: מילים: ${(wordsRatio * 100).toFixed(1)}%, תווים: ${(charsRatio * 100).toFixed(1)}%, שורות: ${(linesRatio * 100).toFixed(1)}%, שורות אחרונות: ${lastLinesPresent ? 'קיימות' : 'חסרות'}`);
        }
        
        return {
            originalWords,
            organizedWords,
            wordsRatio,
            originalChars,
            organizedChars,
            charsRatio,
            originalLines: originalLines.length,
            organizedLines: organizedLines.length,
            linesRatio,
            lastLinesPresent,
            missingLastLines: missingLastLines || [],
            isValid: isValid && lastLinesPresent
        };
    }

    /**
     * קבלת מידע התקדמות עבור תהליך
     */
    getProcessInfo(processId) {
        return this.activeProcesses.get(processId);
    }

    /**
     * ביטול תהליך
     */
    cancelProcess(processId) {
        const processInfo = this.activeProcesses.get(processId);
        if (processInfo) {
            processInfo.status = 'cancelled';
            this.emit('cancelled', processId);
            this.activeProcesses.delete(processId);
        }
    }

    /**
     * השהיה (utility function)
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new TextOrganizationProgressService();

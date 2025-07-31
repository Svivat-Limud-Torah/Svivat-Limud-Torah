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
        const baseSteps = [
            {
                title: 'הכנה וניתוח ראשוני',
                description: 'ניתוח מבנה הטקסט וזיהוי דפוסים',
                subSteps: [
                    'זיהוי כותרות קיימות',
                    'ניתוח מבנה פסקאות',
                    'זיהוי רשימות ואלמנטים מיוחדים'
                ]
            },
            {
                title: 'יצירת אסטרטגיית ארגון',
                description: 'יצירת prompt מותאם לטקסט הספציפי',
                subSteps: [
                    'בחירת היררכיית כותרות מתאימה',
                    'הגדרת עומק הארגון',
                    'התאמת פרמטרים למודל AI'
                ]
            },
            {
                title: 'עיבוד בבינה מלאכותית',
                description: 'שליחה לבינה מלאכותית לארגון',
                subSteps: [
                    'שליחת הטקסט למודל',
                    'קבלת התגובה',
                    'ניתוח ראשוני של התוצאה'
                ]
            },
            {
                title: 'עיבוד ושיפור תוצאות',
                description: 'ניקוי ושיפור הטקסט המאורגן',
                subSteps: [
                    'ניקוי תגיות מיותרות',
                    'תיקון פורמט Markdown',
                    'איחוד שורות ריקות מיותרות'
                ]
            },
            {
                title: 'אימות איכות וסיום',
                description: 'בדיקת איכות התוצאה הסופית',
                subSteps: [
                    'אימות שלמות התוכן',
                    'בדיקת תקינות הפורמט',
                    'הכנה להחזרה'
                ]
            }
        ];

        // הוספת שלבים נוספים לטקסטים גדולים
        if (textLength > 200) {
            baseSteps.splice(2, 0, {
                title: 'חלוקה לקטעים',
                description: 'חלוקת טקסט גדול לקטעים לעיבוד מיטבי',
                subSteps: [
                    'זיהוי נקודות חלוקה טבעיות',
                    'חלוקה לקטעים מאוזנים',
                    'שמירת הקשר בין קטעים'
                ]
            });
        }

        return baseSteps;
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
     * יצירת prompt מותאם
     */
    async createOptimizedPrompt(text, basePrompt, textLength, disableItalicFormatting = false) {
        await this.delay(300);
        
        const analysis = await this.analyzeTextStructure(text);
        
        // Create formatting instruction based on user preference
        const formattingInstructions = disableItalicFormatting 
            ? `4. הדגש מילות מפתח חשובות (**מילה**) - אל תשתמש בעיצוב נטייה (*מילה*)`
            : `4. הדגש מילות מפתח חשובות (**מילה**, *מילה*)`;
        
        let optimizedPrompt = basePrompt || `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט הספציפי שהמשתמש סיפק ולא ליצור תוכן חדש.

🔥 חוקים קריטיים - CRITICAL RULES:
• שמור על כל התוכן המקורי - אל תמחק או תחסיר מידע
• ⚠️ חובה לשמור על השורות האחרונות של הטקסט המקורי ללא יוצא מהכלל!
• אל תחזור על תוכן - כל חלק צריב להופיע פעם אחת בלבד  
• וודא שהטקסט המאורגן כולל את כל התוכן המקורי מההתחלה ועד הסוף
• אל תוסיף מידע שלא היה בטקסט המקורי
• אל תחליף את התוכן בנושא אחר - רק ארגן את מה שכבר קיים!
• אסור לך ליצור תוכן חדש על תיקון מידות או נושאים אחרים!
• המילה האחרונה בטקסט המאורגן חייבת להיות זהה או קרובה למילה האחרונה בטקסט המקורי!

⚠️ אזהרה חשובה: 
המשתמש רוצה לארגן את הטקסט שלו, לא לקבל תוכן חדש על נושא אחר!
אל תחליף את התוכן המקורי בתוכן על נושאים כמו תיקון מידות או כל נושא אחר!

📋 משימות הארגון:
1. צור היררכיה ברורה עם כותרות H1, H2, H3 לפי הקשר הלוגי של הטקסט הקיים
2. חלק לפסקאות מובנות ונושאיות את התוכן הקיים
3. ארגן רשימות בפורמט Markdown נכון (-, *, 1., 2., וכו')
${formattingInstructions}
5. צור מבנה לוגי וזורם שקל לקריאה של התוכן הקיים
6. שפר פיסוק ומבנה משפטים ללא שינוי המשמעות
7. הסר שורות ריקות מיותרות (לא יותר מ-2 שורות ריקות ברצף)
8. 🚨 ודא שהסיום של הטקסט המאורגן כולל את כל התוכן שהיה בסוף הטקסט המקורי!

📖 כללי פורמט:
• השתמש בעברית תקינה וברורה
• שמור על המינוח המקורי של מושגים יהודיים/תורניים
• ארגן ציטוטים ומקורות בפורמט אחיד
• צור מבנה חזותי נעים ומאורגן
• אל תשנה את הנושא או התוכן - רק ארגן אותו!
• 🔥 חובה להגיע עד סוף הטקסט המקורי - אל תעצור באמצע!

🚨 זכור: המטרה היא לארגן את הטקסט הקיים מתחילתו ועד סופו, לא ליצור תוכן חדש!
`;

        // התאמות מיוחדות לפי גודל הטקסט
        if (textLength > 200) {
            optimizedPrompt += `

🔧 הנחיות מיוחדות לטקסט גדול (${textLength} שורות):
• חלק לחלקים ראשיים עם כותרות H1 על פי התוכן הקיים
• השתמש בכותרות H2 לתת-נושאים מהתוכן הקיים
• וודא זרימה לוגית בין הקטעים הקיימים
• שמור על היררכיה עקבית לאורך הטקסט הקיים
• 🚨 חובה מוחלטת: כלול את כל התוכן מההתחלה ועד הסוף - אל תעצור באמצע!
• בדוק שהמילה האחרונה בטקסט המאורגן תואמת לסוף הטקסט המקורי
• אסור לחתוך את הטקסט או להשאיר חלקים מהסוף!
`;
        } else {
            optimizedPrompt += `

🔧 הנחיות מיוחדות לטקסט קצר/בינוני (${textLength} שורות):
• ארגן בצורה פשוטה וברורה
• השתמש בכותרות H2, H3 לפי הצורך
• שמור על זרימה טבעית של הטקסט
• 🚨 חובה: כלול את כל התוכן ללא יוצא מהכלל!
`;
        }

        return optimizedPrompt;
    }

    /**
     * קריאה לבינה מלאכותית עם מעקב התקדמות
     */
    async callAIForOrganization(text, prompt, model, apiKey, processId) {
        const processInfo = this.activeProcesses.get(processId);
        
        // עדכון מצב שליחה
        if (processInfo) {
            processInfo.steps[processInfo.currentStep].currentOperation = 'שולח בקשה למודל AI...';
            this.emit('progress', processId, processInfo);
        }

        try {
            // השתמש בפונקציה הקיימת מ-SmartSearchService
            const organizedText = await organizeText(text, prompt, model, apiKey);
            
            // עדכון מצב
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

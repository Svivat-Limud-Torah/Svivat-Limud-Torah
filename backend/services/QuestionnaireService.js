// backend/services/QuestionnaireService.js
const dbOperations = require('../database');
// const aiApiService = require('./aiApiService'); // Assuming an AI service for generating questions/summary

// For now, mock AI interactions. Replace with actual AI calls later.
const mockAiApiService = {
    generateDailyQuestions: async (dateString) => { // Added dateString for potential context
        await new Promise(resolve => setTimeout(resolve, 300)); 
        const baseQuestions = [
            "מה למדת היום שחידש לך משהו שלא ידעת קודם?",
            "האם הרגשת סיפוק מההספק שלך היום בלימוד, ומדוע?",
            "איזו נקודה מהלימוד היום היית רוצה לחקור יותר לעומק?",
            "כיצד אתה מתכנן ליישם משהו שלמדת היום?",
            "תאר רגע אחד מהלימוד היום שהיה משמעותי עבורך במיוחד."
        ];
        // Simple way to vary questions slightly based on date, could be more sophisticated
        const dayOfMonth = parseInt(dateString.split('-')[2], 10);
        const q1Index = dayOfMonth % baseQuestions.length;
        let q2Index = (dayOfMonth + 1) % baseQuestions.length;
        if (q1Index === q2Index) q2Index = (q2Index + 1) % baseQuestions.length;

        return [
            { id: 'ai_q1', text: baseQuestions[q1Index], type: 'text' },
            { id: 'ai_q2', text: baseQuestions[q2Index], type: 'text' },
        ];
    },
    generateWeeklySummary: async (weeklyAnswers) => {
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        
        const answeredDays = weeklyAnswers.filter(ans => ans.rating_today !== null || ans.details_today || ans.ai_q1_answer || ans.ai_q2_answer);
        const missedDaysCount = 7 - answeredDays.length; // Assuming a 7-day week

        if (answeredDays.length === 0) {
            return {
                summary_content: "לא סופקו נתונים כלל השבוע. לא ניתן ליצור סיכום.",
                strengths: "לא ידוע עקב חוסר נתונים.",
                areas_for_improvement: "יש למלא את השאלון היומי כדי לקבל משוב.",
            };
        }

        let totalRating = 0;
        let learningDetailsSnippets = [];
        let validRatingsCount = 0;

        answeredDays.forEach(ans => {
            if (ans.rating_today !== null) {
                totalRating += ans.rating_today;
                validRatingsCount++;
            }
            if(ans.details_today) learningDetailsSnippets.push(ans.details_today.substring(0,50) + (ans.details_today.length > 50 ? "..." : ""));
            else if (ans.ai_q1_answer) learningDetailsSnippets.push(ans.ai_q1_answer.substring(0,50) + (ans.ai_q1_answer.length > 50 ? "..." : ""));
        });
        
        const avgRating = validRatingsCount > 0 ? (totalRating / validRatingsCount).toFixed(1) : "N/A";
        
        let summaryContent = `השבוע, מתוך ${answeredDays.length} ימים עם נתונים, הדירוג הממוצע (לימים שדורגו) היה ${avgRating}.`;
        if (learningDetailsSnippets.length > 0) {
             summaryContent += ` כמה דגשים מהתכנים שנלמדו: ${learningDetailsSnippets.slice(0, 2).join('; ')}.`;
        } else {
            summaryContent += " לא פורטו תכנים באופן משמעותי.";
        }
        if (missedDaysCount > 0) {
            summaryContent += ` ${missedDaysCount} ימים חסרו נתונים השבוע.`;
        }

        return {
            summary_content: summaryContent,
            strengths: `הנקודות החזקות שעלו כללו התמדה בימים בהם מולא השאלון. דירוג ממוצע של ${avgRating} מעיד על... (ניתן להרחיב)`,
            areas_for_improvement: `כדאי לשים לב למילוי יומי של השאלון. ${missedDaysCount > 0 ? `בפרט, ${missedDaysCount} ימים ללא נתונים.` : ''} אם יש ימים עם דירוג נמוך, כדאי לבחון את הסיבות.`,
        };
    }
};

const getFormattedDateString = (date) => { // date can be Date object or YYYY-MM-DD string
    if (typeof date === 'string') return date; // Assume already formatted
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const getWeekBoundaryDates = (dateInput) => { // dateInput can be Date object or YYYY-MM-DD string
    const current = new Date(dateInput); // Handles both Date objects and string 'YYYY-MM-DD'
    current.setHours(0,0,0,0); // Normalize time to start of day
    
    const dayOfWeek = current.getDay(); // Sunday - 0, Monday - 1 .. Saturday - 6
    
    const startDate = new Date(current);
    startDate.setDate(current.getDate() - dayOfWeek); // Go back to Sunday
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Go to Saturday
        
    return {
        weekStartDate: getFormattedDateString(startDate),
        weekEndDate: getFormattedDateString(endDate),
    };
};


async function getFullQuestionnaireForDate(dateStringInput) { // dateString is YYYY-MM-DD
    const dateString = getFormattedDateString(new Date(dateStringInput)); // Ensure consistent format and valid date
    return new Promise((resolve, reject) => {
        dbOperations.getQuestionnaireByDate(dateString, async (err, submittedQuestionnaire) => {
            if (err) return reject(err);
            
            // Prepare fixed questions (always the same)
            const fixedQuestions = [
                { id: 'rating_today', text: 'איך אתה מדרג את הלימוד שלך היום מ1-10?', type: 'rating' },
                { id: 'details_today', text: 'פרט קצת איך עבר הלימוד היום?', type: 'text' },
            ];

            if (submittedQuestionnaire) {
                // If submitted, return submitted data along with question structure for potential viewing/editing
                const questionnaireStructure = {
                    fixedQuestions: fixedQuestions.map(q => ({...q, answer: submittedQuestionnaire[q.id]})),
                    aiQuestions: [ // Reconstruct AI questions with their answers if available
                        ...(submittedQuestionnaire.ai_q1_text ? [{ id: 'ai_q1', text: submittedQuestionnaire.ai_q1_text, type: 'text', answer: submittedQuestionnaire.ai_q1_answer }] : []),
                        ...(submittedQuestionnaire.ai_q2_text ? [{ id: 'ai_q2', text: submittedQuestionnaire.ai_q2_text, type: 'text', answer: submittedQuestionnaire.ai_q2_answer }] : [])
                    ],
                };
                return resolve({ 
                    submitted_today: true, // "today" here refers to the queried date
                    data: questionnaireStructure,
                    submitted_data: submittedQuestionnaire // send the raw submission too
                });
            }

            try {
                // If not submitted, generate AI questions for this specific date
                const aiQuestions = await mockAiApiService.generateDailyQuestions(dateString);
                const fullQuestionnaire = {
                    fixedQuestions: fixedQuestions,
                    aiQuestions: aiQuestions,
                };
                resolve({ submitted_today: false, data: fullQuestionnaire, submitted_data: null });
            } catch (aiErr) {
                console.error(`AI Error generating daily questions for ${dateString}:`, aiErr);
                reject(new Error("Failed to generate AI questions for questionnaire."));
            }
        });
    });
}

async function submitFullQuestionnaire(answers, dateStringInput) { // dateString is YYYY-MM-DD
    const dateString = getFormattedDateString(new Date(dateStringInput)); // Ensure consistent format

    const questionnaireData = {
        date: dateString,
        rating_today: answers['rating_today'] ? parseInt(answers['rating_today'], 10) : null,
        details_today: answers['details_today'] || null,
        ai_q1_text: answers['ai_q1_text'] || null, 
        ai_q1_answer: answers['ai_q1'] || null,    
        ai_q2_text: answers['ai_q2_text'] || null, 
        ai_q2_answer: answers['ai_q2'] || null,
    };

    return new Promise((resolve, reject) => {
        dbOperations.submitQuestionnaire(questionnaireData, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

async function generateAndSaveWeeklySummary(forDateInput = new Date()) { // forDateInput can be Date or YYYY-MM-DD
    const forDate = typeof forDateInput === 'string' ? new Date(forDateInput) : forDateInput;
    const { weekStartDate, weekEndDate } = getWeekBoundaryDates(forDate);

    return new Promise((resolve, reject) => {
        dbOperations.getWeeklyQuestionnaireAnswers(weekStartDate, weekEndDate, async (err, answersFromDb) => {
            if (err) return reject(err);

            // Ensure all 7 days of the week are represented, even if no data exists in DB
            const allWeekDays = [];
            let currentDate = new Date(weekStartDate);
            for (let i = 0; i < 7; i++) {
                const dateStr = getFormattedDateString(currentDate);
                const existingAnswer = answersFromDb.find(a => a.date === dateStr);
                allWeekDays.push(existingAnswer || { 
                    date: dateStr, 
                    rating_today: null, 
                    details_today: null, 
                    ai_q1_text: null, 
                    ai_q1_answer: null, 
                    ai_q2_text: null, 
                    ai_q2_answer: null 
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            try {
                const aiSummary = await mockAiApiService.generateWeeklySummary(allWeekDays);
                const summaryDataToSave = {
                    week_start_date: weekStartDate,
                    summary_content: aiSummary.summary_content,
                    strengths: aiSummary.strengths,
                    areas_for_improvement: aiSummary.areas_for_improvement,
                };

                dbOperations.saveWeeklySummary(summaryDataToSave, (saveErr, savedSummaryInfo) => {
                    if (saveErr) return reject(saveErr);
                    resolve({ message: "Weekly summary generated and saved.", summaryId: savedSummaryInfo.id, summaryData: summaryDataToSave });
                });
            } catch (aiErr) {
                console.error("AI Error generating weekly summary:", aiErr);
                reject(new Error("Failed to generate AI weekly summary."));
            }
        });
    });
}


module.exports = {
    getFullQuestionnaireForDate,
    submitFullQuestionnaire,
    getWeekBoundaryDates, 
    generateAndSaveWeeklySummary,
    getFormattedDateString, // Export for utility
};
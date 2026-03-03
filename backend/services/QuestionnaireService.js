// backend/services/QuestionnaireService.js
const dbOperations = require('../database');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const DEFAULT_MODEL = 'gemini-2.0-flash';

// ── Gemini utility ────────────────────────────────────────────────────────────
async function callGemini(contents, systemInstruction, apiKey, model = DEFAULT_MODEL) {
    if (!apiKey) throw new Error('מפתח API נדרש לשימוש ב-AI.');
    const url = `${GEMINI_API_BASE}${model}:generateContent?key=${apiKey}`;
    const body = {
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    };
    if (systemInstruction) {
        body.system_instruction = { parts: [{ text: systemInstruction }] };
    }
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `שגיאת Gemini API: ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

const FIXED_QUESTIONS = [
    { id: 'rating_today', text: 'איך אתה מדרג את הלימוד שלך היום מ-1 עד 10?', type: 'rating' },
    { id: 'details_today', text: 'פרט קצת איך עבר הלימוד היום?', type: 'text' },
];

const AI_QUESTION_POOL = [
    "מה למדת היום שחידש לך משהו שלא ידעת קודם?",
    "האם הרגשת סיפוק מההספק שלך היום בלימוד, ומדוע?",
    "איזו נקודה מהלימוד היום היית רוצה לחקור יותר לעומק?",
    "כיצד אתה מתכנן ליישם משהו שלמדת היום?",
    "תאר רגע אחד מהלימוד היום שהיה משמעותי עבורך במיוחד.",
    "מה האתגר הגדול ביותר שנתקלת בו היום בלימוד?",
    "האם הייתה שאלה שנשארה פתוחה אצלך מהלימוד של היום?",
];

const getFormattedDateString = (date) => {
    if (typeof date === 'string') return date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekBoundaryDates = (dateInput) => {
    const current = new Date(dateInput);
    current.setHours(0,0,0,0);
    const dayOfWeek = current.getDay();
    const startDate = new Date(current);
    startDate.setDate(current.getDate() - dayOfWeek);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return {
        weekStartDate: getFormattedDateString(startDate),
        weekEndDate: getFormattedDateString(endDate),
    };
};

// ── Daily questionnaire ───────────────────────────────────────────────────────
async function getFullQuestionnaireForDate(dateStringInput) {
    const dateString = getFormattedDateString(new Date(dateStringInput));
    return new Promise((resolve, reject) => {
        dbOperations.getQuestionnaireByDate(dateString, async (err, submitted) => {
            if (err) return reject(err);

            if (submitted) {
                const structure = {
                    fixedQuestions: FIXED_QUESTIONS.map(q => ({ ...q, answer: submitted[q.id] })),
                    aiQuestions: [
                        ...(submitted.ai_q1_text ? [{ id: 'ai_q1', text: submitted.ai_q1_text, type: 'text', answer: submitted.ai_q1_answer }] : []),
                        ...(submitted.ai_q2_text ? [{ id: 'ai_q2', text: submitted.ai_q2_text, type: 'text', answer: submitted.ai_q2_answer }] : []),
                    ],
                };
                return resolve({ submitted_today: true, data: structure, submitted_data: submitted });
            }

            // Generate 2 AI questions for today
            const day = parseInt(dateString.split('-')[2], 10);
            const q1 = AI_QUESTION_POOL[day % AI_QUESTION_POOL.length];
            const q2 = AI_QUESTION_POOL[(day + 2) % AI_QUESTION_POOL.length];
            const aiQuestions = [
                { id: 'ai_q1', text: q1, type: 'text' },
                { id: 'ai_q2', text: q2, type: 'text' },
            ];
            resolve({ submitted_today: false, data: { fixedQuestions: FIXED_QUESTIONS, aiQuestions }, submitted_data: null });
        });
    });
}

async function submitFullQuestionnaire(answers, dateStringInput) {
    const dateString = getFormattedDateString(new Date(dateStringInput));
    const data = {
        date: dateString,
        rating_today: answers['rating_today'] ? parseInt(answers['rating_today'], 10) : null,
        details_today: answers['details_today'] || null,
        ai_q1_text: answers['ai_q1_text'] || null,
        ai_q1_answer: answers['ai_q1'] || null,
        ai_q2_text: answers['ai_q2_text'] || null,
        ai_q2_answer: answers['ai_q2'] || null,
    };
    return new Promise((resolve, reject) => {
        dbOperations.submitQuestionnaire(data, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// ── Weekly summary with real Gemini (fallback to mock) ────────────────────────
function buildWeeklySummaryPrompt(weeklyAnswers) {
    const lines = weeklyAnswers.map(a => {
        if (!a.rating_today && !a.details_today && !a.ai_q1_answer && !a.ai_q2_answer) {
            return `${a.date}: לא מולא`;
        }
        const parts = [`${a.date}:`];
        if (a.rating_today) parts.push(`דירוג ${a.rating_today}/10`);
        if (a.details_today) parts.push(`פירוט: ${a.details_today}`);
        if (a.ai_q1_text && a.ai_q1_answer) parts.push(`${a.ai_q1_text}: ${a.ai_q1_answer}`);
        if (a.ai_q2_text && a.ai_q2_answer) parts.push(`${a.ai_q2_text}: ${a.ai_q2_answer}`);
        return parts.join(' | ');
    });
    return lines.join('\n');
}

async function generateWeeklySummaryWithGemini(weeklyAnswers, apiKey, model = null) {
    const dataText = buildWeeklySummaryPrompt(weeklyAnswers);
    const prompt = `להלן נתוני לימוד של המשתמש לשבוע:

${dataText}

צור סיכום שבועי מקיף בעברית. החזר JSON בדיוק בפורמט הבא (ללא markdown):
{
  "summary_content": "פסקת סיכום כללית של השבוע",
  "strengths": "נקודות חוזק שעלו מהנתונים",
  "areas_for_improvement": "תחומים לשיפור"
}`;

    const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], null, apiKey, model);
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
}

async function generateAndSaveWeeklySummary(forDateInput = new Date(), apiKey = null, model = null) {
    const forDate = typeof forDateInput === 'string' ? new Date(forDateInput) : forDateInput;
    const { weekStartDate, weekEndDate } = getWeekBoundaryDates(forDate);

    return new Promise((resolve, reject) => {
        dbOperations.getWeeklyQuestionnaireAnswers(weekStartDate, weekEndDate, async (err, answersFromDb) => {
            if (err) return reject(err);

            const allWeekDays = [];
            let cur = new Date(weekStartDate);
            for (let i = 0; i < 7; i++) {
                const ds = getFormattedDateString(cur);
                const existing = answersFromDb.find(a => a.date === ds);
                allWeekDays.push(existing || { date: ds, rating_today: null, details_today: null, ai_q1_text: null, ai_q1_answer: null, ai_q2_text: null, ai_q2_answer: null });
                cur.setDate(cur.getDate() + 1);
            }

            try {
                let aiSummary;
                if (apiKey) {
                    aiSummary = await generateWeeklySummaryWithGemini(allWeekDays, apiKey, model);
                } else {
                    // Fallback mock
                    const answered = allWeekDays.filter(a => a.rating_today !== null || a.details_today);
                    const avg = answered.length
                        ? (answered.reduce((s, a) => s + (a.rating_today || 0), 0) / answered.filter(a => a.rating_today).length).toFixed(1)
                        : 'N/A';
                    aiSummary = {
                        summary_content: `השבוע נמלאו ${answered.length} ימים. דירוג ממוצע: ${avg}.`,
                        strengths: 'מילוי שאלון עקבי.',
                        areas_for_improvement: `${7 - answered.length} ימים חסרים.`,
                    };
                }

                const toSave = { week_start_date: weekStartDate, ...aiSummary };
                dbOperations.saveWeeklySummary(toSave, (saveErr, info) => {
                    if (saveErr) return reject(saveErr);
                    resolve({ message: 'סיכום שבועי נוצר ונשמר.', summaryId: info.id, summaryData: toSave });
                });
            } catch (aiErr) {
                console.error('AI error generating weekly summary:', aiErr);
                reject(new Error('שגיאה ביצירת הסיכום השבועי.'));
            }
        });
    });
}

// ── Personal insights (based on ALL history) ──────────────────────────────────
function buildHistoryContext(summaries, recentRaw) {
    const summaryLines = summaries.map(s =>
        `שבוע ${s.week_start_date}: ${s.summary_content} | חוזקות: ${s.strengths || '-'} | לשיפור: ${s.areas_for_improvement || '-'}`
    ).join('\n');

    const recentLines = recentRaw.slice(-14).map(r => {
        if (!r.rating_today && !r.details_today) return null;
        return `${r.date}: דירוג ${r.rating_today || '?'}/10. ${r.details_today || ''}`.trim();
    }).filter(Boolean).join('\n');

    return `=== סיכומים שבועיים (כל ההיסטוריה) ===\n${summaryLines || 'אין סיכומים עדיין.'}\n\n=== נתונים יומיים אחרונים ===\n${recentLines || 'אין נתונים.'}`;
}

async function generatePersonalInsights(apiKey, model = null) {
    const [summaries, rawHistory] = await Promise.all([
        new Promise((res, rej) => dbOperations.getAllWeeklySummaries((e, r) => e ? rej(e) : res(r))),
        new Promise((res, rej) => dbOperations.getAllQuestionnaireHistory((e, r) => e ? rej(e) : res(r))),
    ]);

    if (summaries.length === 0 && rawHistory.length === 0) {
        throw new Error('אין מספיק נתונים ליצירת תובנות. מלא לפחות מספר שאלונים.');
    }

    const historyCtx = buildHistoryContext(summaries, rawHistory);

    const prompt = `אתה מנתח דפוסי לימוד של תלמיד תורה. להלן כל ההיסטוריה שלו:

${historyCtx}

נתח את הנתונים ביסודיות והחזר JSON בדיוק בפורמט הזה (ללא markdown, בעברית):
{
  "overall_assessment": "הערכה כוללת של המשתמש כלומד (2-3 משפטים)",
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3"],
  "areas_for_growth": ["תחום לצמיחה 1", "תחום לצמיחה 2", "תחום לצמיחה 3"],
  "learning_patterns": "תיאור דפוסי הלימוד שזוהו (ימים טובים, זמנים, נושאים)",
  "tips": ["טיפ מעשי 1", "טיפ מעשי 2", "טיפ מעשי 3", "טיפ מעשי 4", "טיפ מעשי 5"],
  "recommendations": ["המלצה 1", "המלצה 2", "המלצה 3"],
  "motivation_message": "מסר מעורר השראה אישי למשתמש"
}`;

    const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], null, apiKey, model || undefined);
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
}

// ── Personal AI chat (user data only, no grounding) ───────────────────────────────────────────────
async function chatWithPersonalAI(chatHistory, apiKey, model = null) {
    const [summaries, rawHistory] = await Promise.all([
        new Promise((res, rej) => dbOperations.getAllWeeklySummaries((e, r) => e ? rej(e) : res(r))),
        new Promise((res, rej) => dbOperations.getAllQuestionnaireHistory((e, r) => e ? rej(e) : res(r))),
    ]);

    const historyCtx = buildHistoryContext(summaries, rawHistory);

    const systemInstruction = `אתה עוזר לימוד תורה אישי. המידע היחיד שיש לך הוא ההיסטוריה של המשתמש המוצגת להלן.
ענה אך ורק על בסיס הנתונים של המשתמש. אל תשתמש בשום ידע חיצוני.
אם שואלים שאלה שאינה קשורה להיסטוריית הלימוד, ציין בנימוס שאתה מוגבל לנתוני המשתמש בלבד.
ענה תמיד בעברית בגוף שני (פנייה למשתמש).

${historyCtx}`;

    // chatHistory is array of { role: 'user'|'model', content: string }
    const contents = chatHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
    }));

    return callGemini(contents, systemInstruction, apiKey, model || undefined);
}


module.exports = {
    getFullQuestionnaireForDate,
    submitFullQuestionnaire,
    getWeekBoundaryDates,
    generateAndSaveWeeklySummary,
    generatePersonalInsights,
    chatWithPersonalAI,
    getFormattedDateString,
};

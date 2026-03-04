// frontend/src/services/WebApiService.js
// Complete client-side implementation of all backend API methods for web mode.
// Uses localStorage for data persistence and direct Gemini API calls for AI.

import { callGemini, cleanAIResponseForJSON, getApiKey, getSelectedModel } from './GeminiService';

// ─── localStorage key helpers ────────────────────────────────────────────────
const LS = {
  questionnaires: 'web_questionnaires',
  weeklySummaries: 'web_weekly_summaries',
  notificationSettings: 'web_notification_settings',
  repetitions: 'web_repetitions',
  recentFiles: 'web_recent_files',
  frequentFiles: 'web_frequent_files',
  lastOpenedFolders: 'web_last_opened_folders',
  fileUsageStats: 'web_file_usage_stats',
  activityLog: 'web_activity_log',
};

// Keys whose default (empty) value is an object, not an array
const LS_OBJECT_KEYS = new Set(['questionnaires', 'fileUsageStats']);

function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Date helpers (mirror backend exactly) ───────────────────────────────────
function getFormattedDateString(date) {
  if (typeof date === 'string') return date;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekBoundaryDates(dateInput) {
  const current = new Date(dateInput);
  current.setHours(0, 0, 0, 0);
  const dayOfWeek = current.getDay(); // 0=Sunday
  const startDate = new Date(current);
  startDate.setDate(current.getDate() - dayOfWeek);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return {
    weekStartDate: getFormattedDateString(startDate),
    weekEndDate: getFormattedDateString(endDate),
  };
}

// ─── Questionnaire constants (mirror backend exactly) ────────────────────────
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

// ─── Smart-search helpers (mirror backend SmartSearchService exactly) ─────────
const HEBREW_STOP_WORDS = new Set([
  'של', 'על', 'את', 'עם', 'הוא', 'היא', 'הם', 'הן', 'אני', 'זה', 'זו', 'זאת',
  'לא', 'כן', 'או', 'אם', 'גם', 'רק', 'אבל', 'כי', 'מה', 'איפה', 'מתי', 'למה',
  'איך', 'כמה', 'כל', 'היה', 'היו', 'יהיה', 'להיות', 'יש', 'אין', 'בו', 'בה',
  'לו', 'לה', 'שלו', 'שלה', 'כמו', 'אחרי', 'לפני', 'בין', 'תחת', 'מעל', 'ליד',
  'דרך', 'בלי', 'עד', 'מאוד', 'כבר', 'עוד', 'שם', 'פה', 'כאן', 'אולי', 'ממש',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'and', 'but', 'or', 'not', 'no', 'nor',
  'so', 'very', 'just', 'about', 'up', 'out', 'if', 'then', 'than',
  'too', 'also', 'that', 'this', 'these', 'those', 'it', 'its',
  'כתבתי', 'כתוב', 'נמצא', 'בעבר', 'פעם', 'מישהו', 'משהו',
]);

function extractKeywords(query) {
  const raw = query
    .replace(/["""״׳'`\-–—,.;:!?()[\]{}<>\/\\@#$%^&*+=~|]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !HEBREW_STOP_WORDS.has(w));
  return [...new Set(raw)];
}

function removeHebrewPrefixes(word) {
  const prefixes = /^[בהוכלמש]/;
  if (word.length > 3 && prefixes.test(word)) return [word, word.slice(1)];
  return [word];
}

function scoreFileByPath(fileData, keywords) {
  const nameLower = fileData.name.toLowerCase();
  const pathLower = fileData.relativePath.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const variants = removeHebrewPrefixes(kw.toLowerCase());
    for (const v of variants) {
      if (nameLower.includes(v)) score += 30;
      else if (pathLower.includes(v)) score += 15;
    }
  }
  return Math.min(score, 100);
}

function searchFileContent(fileData, keywords) {
  const content = fileData.content;
  if (!content) return { matches: [], totalScore: 0, content };
  const lines = content.split('\n');
  const matches = [];
  let totalScore = 0;
  const allVariants = [];
  for (const kw of keywords) {
    for (const v of removeHebrewPrefixes(kw.toLowerCase())) allVariants.push(v);
  }
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    let lineScore = 0;
    const matchedKeywords = [];
    for (const variant of allVariants) {
      if (lineLower.includes(variant)) { lineScore += 10; matchedKeywords.push(variant); }
    }
    if (lineScore > 0) {
      if (matchedKeywords.length > 1) lineScore += matchedKeywords.length * 5;
      const contextStart = Math.max(0, i - 2);
      const contextEnd = Math.min(lines.length - 1, i + 2);
      matches.push({
        lineNumber: i + 1,
        lineText: lines[i],
        context: lines.slice(contextStart, contextEnd + 1).join('\n'),
        score: lineScore,
        matchedKeywords,
      });
      totalScore += lineScore;
    }
  }
  matches.sort((a, b) => b.score - a.score);
  return { matches: matches.slice(0, 5), totalScore, content };
}

function localSearch(query, providedFiles) {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return { results: [], filesScanned: 0, keywords: [] };

  const allFiles = (providedFiles || []).map(f => ({
    name: f.name || f.path.split('/').pop(),
    relativePath: f.path,
    content: f.content,
  }));
  if (allFiles.length === 0) return { results: [], filesScanned: 0, keywords };

  const scored = allFiles.map(f => ({ ...f, pathScore: scoreFileByPath(f, keywords) }));
  scored.sort((a, b) => b.pathScore - a.pathScore);

  const fileResults = [];
  for (const fileData of scored) {
    const { matches, totalScore, content } = searchFileContent(fileData, keywords);
    if (matches.length > 0 || fileData.pathScore > 0) {
      fileResults.push({
        relativePath: fileData.relativePath,
        name: fileData.name,
        pathScore: fileData.pathScore,
        contentScore: totalScore,
        combinedScore: fileData.pathScore + totalScore,
        matches,
        content,
      });
    }
  }
  fileResults.sort((a, b) => b.combinedScore - a.combinedScore);

  const results = fileResults.slice(0, 10).map(fr => {
    const bestMatch = fr.matches[0];
    return {
      sourceFile: fr.relativePath,
      fileName: fr.name,
      score: fr.combinedScore,
      matchCount: fr.matches.length,
      lineNumber: bestMatch ? bestMatch.lineNumber : null,
      quote: bestMatch ? bestMatch.lineText.trim() : null,
      context: bestMatch ? bestMatch.context : null,
      matchedKeywords: bestMatch ? bestMatch.matchedKeywords : [],
      _content: fr.content || null,
    };
  });

  return { results, filesScanned: scored.length, totalFiles: allFiles.length, keywords };
}

async function aiDeepAnalysis(localResults, query, model) {
  const topFiles = localResults.results.filter(r => r.score > 0).slice(0, 5);
  if (topFiles.length === 0) return null;
  const filesWithContent = topFiles
    .filter(r => r._content != null)
    .map(r => ({
      filePath: r.sourceFile,
      content: r._content.length > 3000 ? r._content.substring(0, 3000) + '\n... (קובץ קוצר)' : r._content,
    }));
  if (filesWithContent.length === 0) return null;

  const prompt = `אתה עוזר חיפוש חכם. המשתמש מחפש: "${query}"

הנה תוכן הקבצים הרלוונטיים ביותר שנמצאו:
${filesWithContent.map((f, i) => `--- קובץ ${i + 1}: ${f.filePath} ---\n${f.content}`).join('\n\n')}

מצא את התוצאות הכי רלוונטיות לשאילתה.

החזר אובייקט JSON בפורמט הבא:
{
  "results": [
    {
      "quote": "ציטוט מדויק מהטקסט",
      "explanation": "הסבר קצר למה זה רלוונטי",
      "sourceFile": "נתיב הקובץ כפי שסופק",
      "lineNumber": 1,
      "relevanceScore": 95
    }
  ],
  "relatedTerms": ["מונח קשור 1", "מונח קשור 2"],
  "summary": "תקציר קצר של מה שנמצא"
}

כללים:
- החזר עד 5 תוצאות, מהרלוונטית ביותר לפחות
- הציטוט חייב להיות מדויק מהטקסט שסופק
- sourceFile חייב להיות בדיוק כפי שהוא מופיע בקלט
- lineNumber הוא מספר השורה בקובץ (1 = שורה ראשונה)
- relatedTerms: מונחים שיכולים לעזור בחיפוש עתידי
- summary: משפט אחד-שניים שמסכם את הממצאים
- אם לא נמצא כלום רלוונטי, החזר: {"results": [], "relatedTerms": [], "summary": "לא נמצאו תוצאות"}
חשוב: הפלט חייב להיות JSON תקין בלבד, ללא טקסט נוסף.`;

  try {
    const text = await callGemini([{ parts: [{ text: prompt }] }], null, model);
    const cleaned = cleanAIResponseForJSON(text);
    const parsed = JSON.parse(cleaned);
    const validPaths = new Set(filesWithContent.map(f => f.filePath));
    if (parsed.results && Array.isArray(parsed.results)) {
      parsed.results = parsed.results.filter(r => r.sourceFile && validPaths.has(r.sourceFile));
    }
    return parsed;
  } catch (e) {
    console.error('AI Deep Analysis error:', e);
    return null;
  }
}

async function aiDirectSearch(allFiles, query, model) {
  if (!allFiles || allFiles.length === 0) return null;
  const MAX_FILES = 80;
  const PREVIEW_CHARS = 600;
  const filesWithContent = allFiles
    .filter(f => f.content && f.content.trim().length > 20)
    .slice(0, MAX_FILES);
  if (filesWithContent.length === 0) return null;

  const catalog = filesWithContent.map((f, i) => {
    const filePath = f.path || f.relativePath || `file_${i}`;
    const preview = (f.content || '').replace(/[ \t]+/g, ' ').substring(0, PREVIEW_CHARS).trim();
    return `[${i}] ${filePath}\n${preview}`;
  }).join('\n\n---\n\n');

  const prompt = `אתה עוזר חיפוש חכם בסביבת לימוד תורנית. המשתמש מחפש: "${query}"

להלן קטלוג קבצים עם תצוגה מקדימה של תוכנם:

${catalog}

משימתך: מצא קבצים ותוכן רלוונטי לשאילתה.
חשוב:
- חפש לפי משמעות ורעיון, לא רק מילות מפתח מדויקות
- עברית — התחשב בצורות דקדוקיות שונות (יחיד/רבים/נסמך/בניינים שונים)
- שקול גם את שמות הקבצים כרמזים לתוכן
- אם יש כמה תוצאות טובות, החזר את כולן לפי סדר רלוונטיות יורד

החזר JSON תקין בלבד (ללא טקסט נוסף):
{
  "results": [
    {
      "fileIndex": 0,
      "sourceFile": "הנתיב המדויק מהקטלוג",
      "quote": "ציטוט מדויק מהתוכן המוצג",
      "explanation": "הסבר קצר מדוע זה רלוונטי",
      "relevanceScore": 90
    }
  ],
  "relatedTerms": ["מונח קשור 1", "מונח קשור 2"],
  "summary": "תקציר חד-משפטי של הממצאים"
}

אם לא נמצא שום דבר רלוונטי: {"results": [], "relatedTerms": [], "summary": "לא נמצאו תוצאות רלוונטיות"}`;

  try {
    const text = await callGemini([{ parts: [{ text: prompt }] }], null, model);
    const cleaned = cleanAIResponseForJSON(text);
    const parsed = JSON.parse(cleaned);
    if (!parsed.results || parsed.results.length === 0) return null;
    const validResults = parsed.results
      .filter(r => typeof r.fileIndex === 'number' && r.fileIndex >= 0 && r.fileIndex < filesWithContent.length)
      .map(r => {
        const fileData = filesWithContent[r.fileIndex];
        const filePath = fileData.path || fileData.relativePath;
        return {
          sourceFile: filePath,
          fileName: filePath.split('/').pop(),
          quote: r.quote || '',
          explanation: r.explanation || '',
          relevanceScore: r.relevanceScore || 80,
        };
      });
    if (validResults.length === 0) return null;
    return { results: validResults, relatedTerms: parsed.relatedTerms || [], summary: parsed.summary || '' };
  } catch (e) {
    console.error('AI Direct Search error:', e);
    return null;
  }
}

function stripInternalFields(results) {
  if (!Array.isArray(results)) return results;
  return results.map(({ _content, ...rest }) => rest);
}

// ─── V2 Search (client-side regex, mirrors searchLogicV2.js) ─────────────────
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateMatchPreview(lineText, searchTerm, searchRegExp) {
  const positions = [];
  const replaceRegExp = new RegExp(searchRegExp.source, searchRegExp.flags.includes('g') ? searchRegExp.flags : searchRegExp.flags + 'g');
  let resultText = '';
  let lastIndex = 0;
  let match;
  while ((match = replaceRegExp.exec(lineText)) !== null) {
    resultText += lineText.substring(lastIndex, match.index);
    resultText += `@@MATCH_START@@${match[0]}@@MATCH_END@@`;
    positions.push({ start: match.index, end: match.index + match[0].length });
    lastIndex = match.index + match[0].length;
    if (replaceRegExp.lastIndex === match.index) replaceRegExp.lastIndex++;
  }
  resultText += lineText.substring(lastIndex);
  return { preview: resultText, positions };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WebApiService — drop-in replacement for apiService methods in web mode
// ═══════════════════════════════════════════════════════════════════════════════

const WebApiService = {

  // ─── Questionnaire ──────────────────────────────────────────────────────────
  getQuestionnaireForDate: async (dateString) => {
    const ds = getFormattedDateString(new Date(dateString));
    const all = lsGet(LS.questionnaires, {});
    const submitted = all[ds];

    if (submitted) {
      const structure = {
        fixedQuestions: FIXED_QUESTIONS.map(q => ({ ...q, answer: submitted[q.id] })),
        aiQuestions: [
          ...(submitted.ai_q1_text ? [{ id: 'ai_q1', text: submitted.ai_q1_text, type: 'text', answer: submitted.ai_q1_answer }] : []),
          ...(submitted.ai_q2_text ? [{ id: 'ai_q2', text: submitted.ai_q2_text, type: 'text', answer: submitted.ai_q2_answer }] : []),
        ],
      };
      return { submitted_today: true, data: structure, submitted_data: submitted };
    }

    // Generate 2 AI questions for the date
    const day = parseInt(ds.split('-')[2], 10);
    const q1 = AI_QUESTION_POOL[day % AI_QUESTION_POOL.length];
    const q2 = AI_QUESTION_POOL[(day + 2) % AI_QUESTION_POOL.length];
    const aiQuestions = [
      { id: 'ai_q1', text: q1, type: 'text' },
      { id: 'ai_q2', text: q2, type: 'text' },
    ];
    return { submitted_today: false, data: { fixedQuestions: FIXED_QUESTIONS, aiQuestions }, submitted_data: null };
  },

  submitQuestionnaire: async ({ answers, date }) => {
    const ds = getFormattedDateString(new Date(date));
    const all = lsGet(LS.questionnaires, {});
    all[ds] = {
      date: ds,
      rating_today: answers.rating_today ? parseInt(answers.rating_today, 10) : null,
      details_today: answers.details_today || null,
      ai_q1_text: answers.ai_q1_text || null,
      ai_q1_answer: answers.ai_q1_answer || answers.ai_q1 || null,
      ai_q2_text: answers.ai_q2_text || null,
      ai_q2_answer: answers.ai_q2_answer || answers.ai_q2 || null,
    };
    lsSet(LS.questionnaires, all);
    return { success: true };
  },

  getWeeklyAnswers: async (startDate, endDate) => {
    const all = lsGet(LS.questionnaires, {});
    const data = [];
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      const ds = getFormattedDateString(cur);
      data.push(all[ds] || {
        date: ds, rating_today: null, details_today: null,
        ai_q1_text: null, ai_q1_answer: null, ai_q2_text: null, ai_q2_answer: null,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return { data, weekStartDate: startDate, weekEndDate: endDate };
  },

  triggerWeeklySummaryGeneration: async (dateForWeek) => {
    const model = getSelectedModel();
    const forDate = dateForWeek ? new Date(dateForWeek) : new Date();
    const { weekStartDate, weekEndDate } = getWeekBoundaryDates(forDate);

    // Gather week data
    const all = lsGet(LS.questionnaires, {});
    const allWeekDays = [];
    const cur = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      const ds = getFormattedDateString(cur);
      allWeekDays.push(all[ds] || {
        date: ds, rating_today: null, details_today: null,
        ai_q1_text: null, ai_q1_answer: null, ai_q2_text: null, ai_q2_answer: null,
      });
      cur.setDate(cur.getDate() + 1);
    }

    let aiSummary;
    const apiKey = getApiKey();
    if (apiKey) {
      // Build prompt — mirrors backend buildWeeklySummaryPrompt + generateWeeklySummaryWithGemini
      const lines = allWeekDays.map(a => {
        if (!a.rating_today && !a.details_today && !a.ai_q1_answer && !a.ai_q2_answer) return `${a.date}: לא מולא`;
        const parts = [`${a.date}:`];
        if (a.rating_today) parts.push(`דירוג ${a.rating_today}/10`);
        if (a.details_today) parts.push(`פירוט: ${a.details_today}`);
        if (a.ai_q1_text && a.ai_q1_answer) parts.push(`${a.ai_q1_text}: ${a.ai_q1_answer}`);
        if (a.ai_q2_text && a.ai_q2_answer) parts.push(`${a.ai_q2_text}: ${a.ai_q2_answer}`);
        return parts.join(' | ');
      }).join('\n');

      const prompt = `להלן נתוני לימוד של המשתמש לשבוע:

${lines}

צור סיכום שבועי מקיף בעברית. החזר JSON בדיוק בפורמט הבא (ללא markdown):
{
  "summary_content": "פסקת סיכום כללית של השבוע",
  "strengths": "נקודות חוזק שעלו מהנתונים",
  "areas_for_improvement": "תחומים לשיפור"
}`;

      const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], null, model);
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      aiSummary = JSON.parse(clean);
    } else {
      // Fallback mock (mirrors backend exactly)
      const answered = allWeekDays.filter(a => a.rating_today !== null || a.details_today);
      const withRating = answered.filter(a => a.rating_today);
      const avg = withRating.length ? (withRating.reduce((s, a) => s + (a.rating_today || 0), 0) / withRating.length).toFixed(1) : 'N/A';
      aiSummary = {
        summary_content: `השבוע נמלאו ${answered.length} ימים. דירוג ממוצע: ${avg}.`,
        strengths: 'מילוי שאלון עקבי.',
        areas_for_improvement: `${7 - answered.length} ימים חסרים.`,
      };
    }

    // Save
    const summaries = lsGet(LS.weeklySummaries, []);
    const toSave = { week_start_date: weekStartDate, ...aiSummary };
    const idx = summaries.findIndex(s => s.week_start_date === weekStartDate);
    if (idx >= 0) summaries[idx] = toSave; else summaries.push(toSave);
    summaries.sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
    lsSet(LS.weeklySummaries, summaries);

    return { message: 'סיכום שבועי נוצר ונשמר.', summaryData: toSave };
  },

  getLatestWeeklySummary: async () => {
    const summaries = lsGet(LS.weeklySummaries, []);
    return { data: summaries.length > 0 ? summaries[0] : null };
  },

  getAllWeeklySummaries: async () => {
    return { data: lsGet(LS.weeklySummaries, []) };
  },

  generatePersonalInsights: async () => {
    const model = getSelectedModel();
    const summaries = lsGet(LS.weeklySummaries, []);
    const allQ = lsGet(LS.questionnaires, {});
    const rawHistory = Object.values(allQ).sort((a, b) => a.date.localeCompare(b.date));

    if (summaries.length === 0 && rawHistory.length === 0) {
      throw new Error('אין מספיק נתונים ליצירת תובנות. מלא לפחות מספר שאלונים.');
    }

    // Build history context — mirrors backend buildHistoryContext
    const summaryLines = summaries.map(s =>
      `שבוע ${s.week_start_date}: ${s.summary_content} | חוזקות: ${s.strengths || '-'} | לשיפור: ${s.areas_for_improvement || '-'}`
    ).join('\n');
    const recentLines = rawHistory.slice(-14).map(r => {
      if (!r.rating_today && !r.details_today) return null;
      return `${r.date}: דירוג ${r.rating_today || '?'}/10. ${r.details_today || ''}`.trim();
    }).filter(Boolean).join('\n');
    const historyCtx = `=== סיכומים שבועיים (כל ההיסטוריה) ===\n${summaryLines || 'אין סיכומים עדיין.'}\n\n=== נתונים יומיים אחרונים ===\n${recentLines || 'אין נתונים.'}`;

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

    const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], null, model);
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return { success: true, data: JSON.parse(clean) };
  },

  chatWithPersonalAI: async (chatHistory) => {
    const model = getSelectedModel();
    const summaries = lsGet(LS.weeklySummaries, []);
    const allQ = lsGet(LS.questionnaires, {});
    const rawHistory = Object.values(allQ).sort((a, b) => a.date.localeCompare(b.date));

    // Build history context — mirrors backend
    const summaryLines = summaries.map(s =>
      `שבוע ${s.week_start_date}: ${s.summary_content} | חוזקות: ${s.strengths || '-'} | לשיפור: ${s.areas_for_improvement || '-'}`
    ).join('\n');
    const recentLines = rawHistory.slice(-14).map(r => {
      if (!r.rating_today && !r.details_today) return null;
      return `${r.date}: דירוג ${r.rating_today || '?'}/10. ${r.details_today || ''}`.trim();
    }).filter(Boolean).join('\n');
    const historyCtx = `=== סיכומים שבועיים (כל ההיסטוריה) ===\n${summaryLines || 'אין סיכומים עדיין.'}\n\n=== נתונים יומיים אחרונים ===\n${recentLines || 'אין נתונים.'}`;

    const systemInstruction = `אתה עוזר לימוד תורה אישי. המידע היחיד שיש לך הוא ההיסטוריה של המשתמש המוצגת להלן.
ענה אך ורק על בסיס הנתונים של המשתמש. אל תשתמש בשום ידע חיצוני.
אם שואלים שאלה שאינה קשורה להיסטוריית הלימוד, ציין בנימוס שאתה מוגבל לנתוני המשתמש בלבד.
ענה תמיד בעברית בגוף שני (פנייה למשתמש).

${historyCtx}`;

    const contents = chatHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const reply = await callGemini(contents, systemInstruction, model);
    return { success: true, reply };
  },

  // ─── Notification Settings ──────────────────────────────────────────────────
  getUserNotificationSettings: async () => {
    const data = lsGet(LS.notificationSettings, {
      enable_daily_questionnaire_reminder: true,
      reminder_time: '22:00',
    });
    return { data };
  },

  updateUserNotificationSettings: async (settings) => {
    const current = lsGet(LS.notificationSettings, {});
    const updated = { ...current, ...settings };
    lsSet(LS.notificationSettings, updated);
    return { success: true, data: updated };
  },

  // ─── Learning Graph ─────────────────────────────────────────────────────────
  getLearningGraphRatings: async (range) => {
    const allQ = lsGet(LS.questionnaires, {});
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (range === 'all') {
      // Return only submitted dates
      const data = Object.values(allQ)
        .filter(q => q.rating_today != null)
        .map(q => ({ date: q.date, rating: q.rating_today }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return { data };
    }

    const numDays = range === 'month' ? 30 : 7;
    const data = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = getFormattedDateString(d);
      const q = allQ[ds];
      data.push({ date: ds, rating: q ? q.rating_today : null });
    }
    return { data };
  },

  // ─── Repetitions ────────────────────────────────────────────────────────────
  addRepetition: async (repetitionData) => {
    const reps = lsGet(LS.repetitions, []);
    const newId = reps.length > 0 ? Math.max(...reps.map(r => r.id)) + 1 : 1;
    const newRep = {
      ...repetitionData,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_muted: 0,
      completed_at: null,
    };
    reps.push(newRep);
    lsSet(LS.repetitions, reps);
    return { success: true, id: newId, data: newRep };
  },

  getAllRepetitions: async () => {
    return { data: lsGet(LS.repetitions, []) };
  },

  getRepetitionById: async (id) => {
    const reps = lsGet(LS.repetitions, []);
    const rep = reps.find(r => r.id === id);
    if (!rep) throw new Error(`Repetition ${id} not found`);
    return { data: rep };
  },

  updateRepetition: async (id, data) => {
    const reps = lsGet(LS.repetitions, []);
    const idx = reps.findIndex(r => r.id === id);
    if (idx < 0) throw new Error(`Repetition ${id} not found`);
    reps[idx] = { ...reps[idx], ...data, updated_at: new Date().toISOString() };
    lsSet(LS.repetitions, reps);
    return { success: true, data: reps[idx] };
  },

  deleteRepetition: async (id) => {
    let reps = lsGet(LS.repetitions, []);
    reps = reps.filter(r => r.id !== id);
    lsSet(LS.repetitions, reps);
    return { success: true };
  },

  updateRepetitionMuteStatus: async (id, is_muted) => {
    const reps = lsGet(LS.repetitions, []);
    const idx = reps.findIndex(r => r.id === id);
    if (idx < 0) throw new Error(`Repetition ${id} not found`);
    reps[idx].is_muted = is_muted ? 1 : 0;
    reps[idx].updated_at = new Date().toISOString();
    lsSet(LS.repetitions, reps);
    return { success: true, data: reps[idx] };
  },

  markRepetitionAsCompleted: async (id) => {
    const reps = lsGet(LS.repetitions, []);
    const idx = reps.findIndex(r => r.id === id);
    if (idx < 0) throw new Error(`Repetition ${id} not found`);
    reps[idx].completed_at = new Date().toISOString();
    reps[idx].updated_at = new Date().toISOString();
    lsSet(LS.repetitions, reps);
    return { success: true, data: reps[idx] };
  },

  // ─── File Usage Stats ──────────────────────────────────────────────────────
  getRecentFiles: async (baseFolderPath, limit = 10) => {
    const all = lsGet(LS.recentFiles, {});
    const files = (all[baseFolderPath] || []).slice(0, limit);
    return { data: files };
  },

  getFrequentFiles: async (baseFolderPath, limit = 10) => {
    const all = lsGet(LS.frequentFiles, {});
    const files = (all[baseFolderPath] || [])
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, limit);
    return { data: files };
  },

  trackFileAccess: (baseFolderPath, relativePath, fileName) => {
    // Recent files
    const recent = lsGet(LS.recentFiles, {});
    const recentList = recent[baseFolderPath] || [];
    const entry = { relativePath, fileName, lastAccessed: new Date().toISOString() };
    const filtered = recentList.filter(f => f.relativePath !== relativePath);
    filtered.unshift(entry);
    recent[baseFolderPath] = filtered.slice(0, 50);
    lsSet(LS.recentFiles, recent);

    // Frequent files
    const frequent = lsGet(LS.frequentFiles, {});
    const freqList = frequent[baseFolderPath] || [];
    const existing = freqList.find(f => f.relativePath === relativePath);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      existing.lastAccessed = new Date().toISOString();
    } else {
      freqList.push({ relativePath, fileName, count: 1, lastAccessed: new Date().toISOString() });
    }
    frequent[baseFolderPath] = freqList;
    lsSet(LS.frequentFiles, frequent);

    // Also update web_file_usage_stats openCount (time is tracked by App.jsx)
    try {
      const stats = JSON.parse(localStorage.getItem('web_file_usage_stats') || '{}');
      const key = `${baseFolderPath}/${relativePath}`;
      if (!stats[key]) stats[key] = { path: key, basePath: baseFolderPath, relativePath, fileName, openCount: 0, totalSeconds: 0, lastOpened: 0 };
      stats[key].openCount = (stats[key].openCount || 0) + 1;
      stats[key].lastOpened = Date.now();
      stats[key].fileName = fileName;
      stats[key].basePath = baseFolderPath;
      stats[key].relativePath = relativePath;
      localStorage.setItem('web_file_usage_stats', JSON.stringify(stats));
    } catch (e) {}

    // Append to activity log for hourly/daily charts (keep last 1000 entries)
    try {
      const log = JSON.parse(localStorage.getItem('web_activity_log') || '[]');
      log.push(Date.now());
      if (log.length > 1000) log.splice(0, log.length - 1000);
      localStorage.setItem('web_activity_log', JSON.stringify(log));
    } catch (e) {}
  },

  // ─── Settings ──────────────────────────────────────────────────────────────
  getLastOpenedFolders: async () => {
    return { data: lsGet(LS.lastOpenedFolders, []) };
  },

  saveLastOpenedFolders: async (folderPaths) => {
    lsSet(LS.lastOpenedFolders, folderPaths);
    return { success: true };
  },

  // ─── Pilpulta ──────────────────────────────────────────────────────────────
  generatePilpultaQuestions: async (text, useWebSearch, model) => {
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
  { "question": "כיצד ניתן ליישב את דברי רש\\"י כאן עם דבריו במסכת בבא קמא דף ג עמוד א?", "source": "וכתב רש\\"י..." },
  { "question": "מה ההשלכה המעשית של מחלוקת זו בזמן הזה?", "source": "ונחלקו הראשונים..." }
]
ודא שהפלט הוא מערך JSON תקין בלבד, ללא טקסט נוסף לפניו או אחריו.
`;

    const textResp = await callGemini([{ parts: [{ text: prompt }] }], null, model || getSelectedModel());
    const cleaned = cleanAIResponseForJSON(textResp);
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || !parsed.every(q => typeof q.question === 'string' && typeof q.source === 'string')) {
      throw new Error('AI model returned data in an unexpected format.');
    }
    return parsed;
  },

  // ─── Smart Search ──────────────────────────────────────────────────────────
  executeSmartSearch: async (query, model, workspacePath, numFilesToScan, onProgressUpdate, mode = 'deep', files = null) => {
    const startTime = Date.now();

    // Layer 1: Local keyword search
    let localResults;
    try {
      localResults = localSearch(query, files);
    } catch (error) {
      return { notFound: true, reason: `שגיאה בחיפוש מקומי: ${error.message}` };
    }

    if (mode === 'local') {
      if (localResults.results.length === 0) {
        return {
          notFound: true, reason: 'לא נמצאו תוצאות מתאימות לחיפוש.',
          keywords: localResults.keywords, filesScanned: localResults.filesScanned,
          totalFiles: localResults.totalFiles, mode: 'local',
        };
      }
      return {
        found: true, mode: 'local',
        results: stripInternalFields(localResults.results),
        keywords: localResults.keywords, filesScanned: localResults.filesScanned,
        totalFiles: localResults.totalFiles, duration: Date.now() - startTime,
      };
    }

    // Layer 2: AI deep analysis
    const filesHaveContentMatches = localResults.results.some(r => r.matchCount > 0);

    if (filesHaveContentMatches) {
      try {
        if (onProgressUpdate) onProgressUpdate('מנתח תוצאות עם AI...');
        const aiResult = await aiDeepAnalysis(localResults, query, model || getSelectedModel());
        if (aiResult && aiResult.results && aiResult.results.length > 0) {
          return {
            found: true, mode: 'deep',
            results: aiResult.results.map(r => ({
              ...r, sourceFile: r.sourceFile, fileName: r.sourceFile.split('/').pop(),
            })),
            relatedTerms: aiResult.relatedTerms || [], summary: aiResult.summary || '',
            localResults: stripInternalFields(localResults.results.slice(0, 5)),
            keywords: localResults.keywords, filesScanned: localResults.filesScanned,
            totalFiles: localResults.totalFiles, duration: Date.now() - startTime,
          };
        }
      } catch (error) {
        console.error('Smart Search Layer 2 (analysis) error:', error);
      }
    }

    // Layer 2b: AI direct semantic search
    if (files && files.length > 0) {
      try {
        if (onProgressUpdate) onProgressUpdate('סריקה סמנטית עם AI...');
        const directResult = await aiDirectSearch(files, query, model || getSelectedModel());
        if (directResult && directResult.results && directResult.results.length > 0) {
          return {
            found: true, mode: 'deep',
            results: directResult.results,
            relatedTerms: directResult.relatedTerms || [], summary: directResult.summary || '',
            keywords: localResults.keywords, filesScanned: files.length,
            totalFiles: files.length, duration: Date.now() - startTime,
          };
        }
      } catch (error) {
        console.error('Smart Search Layer 2 (direct) error:', error);
      }
    }

    // Local-only fallback
    if (localResults.results.length > 0) {
      return {
        found: true, mode: 'local-fallback',
        results: stripInternalFields(localResults.results),
        keywords: localResults.keywords, filesScanned: localResults.filesScanned,
        totalFiles: localResults.totalFiles, duration: Date.now() - startTime,
      };
    }

    return {
      notFound: true,
      reason: 'לא נמצאו תוצאות מתאימות לחיפוש. נסה לצמצם את השאילתה או לוודא שהקבצים נטענו.',
      keywords: localResults.keywords, filesScanned: localResults.filesScanned,
      totalFiles: localResults.totalFiles, mode, duration: Date.now() - startTime,
    };
  },

  // ─── Simple Text Search ────────────────────────────────────────────────────
  executeSimpleSearch: async (searchText, workspacePath, filterPaths = null, caseSensitive = false, wholeWord = false, providedFiles = null) => {
    if (!searchText || !searchText.trim()) return { results: [], totalMatches: 0, filesSearched: 0 };

    const allFiles = (providedFiles || []).map(f => ({
      name: f.name || f.path.split('/').pop(),
      relativePath: f.path,
      content: f.content,
    }));

    let filesToSearch = allFiles;
    if (filterPaths && filterPaths.length > 0) {
      filesToSearch = allFiles.filter(f =>
        filterPaths.some(fp => {
          const fpNorm = fp.replace(/\\/g, '/');
          return f.relativePath === fpNorm || f.relativePath.startsWith(fpNorm + '/');
        })
      );
    }

    const results = [];
    let totalMatches = 0;
    const searchLower = caseSensitive ? searchText : searchText.toLowerCase();
    let searchRegex = null;
    if (wholeWord) {
      const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(`(?:^|[\\s.,;:!?()\\[\\]{}"\\'\\-])${escaped}(?:[\\s.,;:!?()\\[\\]{}"\\'\\-]|$)`, caseSensitive ? 'g' : 'gi');
    }

    for (const fileData of filesToSearch) {
      const content = fileData.content;
      if (!content) continue;
      const lines = content.split('\n');
      const fileMatches = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineToCheck = caseSensitive ? line : line.toLowerCase();
        let isMatch = false;
        if (wholeWord && searchRegex) {
          searchRegex.lastIndex = 0;
          isMatch = searchRegex.test(line);
        } else {
          isMatch = lineToCheck.includes(searchLower);
        }
        if (isMatch) {
          const contextStart = Math.max(0, i - 1);
          const contextEnd = Math.min(lines.length - 1, i + 1);
          fileMatches.push({ lineNumber: i + 1, lineText: line, context: lines.slice(contextStart, contextEnd + 1).join('\n') });
          totalMatches++;
        }
      }
      if (fileMatches.length > 0) {
        results.push({ relativePath: fileData.relativePath, fileName: fileData.name, matches: fileMatches, matchCount: fileMatches.length });
      }
    }
    results.sort((a, b) => b.matchCount - a.matchCount);
    return { results, totalMatches, filesSearched: filesToSearch.length, totalFiles: allFiles.length, searchText };
  },

  // ─── V2 Search (client-side, mirrors searchLogicV2.js performSearchV2) ──────
  searchV2: async (searchParameters) => {
    const { searchTerm, options = {}, files: providedFiles } = searchParameters;
    const CONTEXT_LINES = 2;

    let searchRegExp;
    try {
      if (options.isRegex) {
        searchRegExp = new RegExp(searchTerm, options.caseSensitive ? 'g' : 'gi');
      } else {
        let escapedTerm = escapeRegExp(searchTerm);
        if (options.wholeWord) escapedTerm = `\\b${escapedTerm}\\b`;
        searchRegExp = new RegExp(escapedTerm, options.caseSensitive ? 'g' : 'gi');
      }
    } catch (e) {
      throw new Error(`Invalid regular expression: ${e.message}`);
    }

    const fileEntries = (providedFiles || []).map(f => ({
      relativePath: f.path,
      fileName: f.name || f.path.split('/').pop(),
      content: f.content,
    }));

    const finalResults = [];
    for (const entry of fileEntries) {
      if (!entry.content) continue;
      const lines = entry.content.split(/\r\n|\r|\n/);
      const fileMatchesDetails = [];

      for (let i = 0; i < lines.length; i++) {
        const currentLineText = lines[i];
        const matchesOnLine = [];
        searchRegExp.lastIndex = 0;
        let match;
        while ((match = searchRegExp.exec(currentLineText)) !== null) {
          matchesOnLine.push({ index: match.index, length: match[0].length, text: match[0] });
          if (match.index === searchRegExp.lastIndex) searchRegExp.lastIndex++;
        }
        if (matchesOnLine.length > 0) {
          const contextBefore = lines.slice(Math.max(0, i - CONTEXT_LINES), i);
          const contextAfter = lines.slice(i + 1, Math.min(lines.length, i + 1 + CONTEXT_LINES));
          const previewData = generateMatchPreview(currentLineText, searchTerm, searchRegExp);
          fileMatchesDetails.push({
            lineNumber: i + 1,
            lineText: currentLineText,
            matchPreview: previewData.preview,
            contextBefore,
            contextAfter,
            charPositionsInLine: previewData.positions,
          });
        }
      }

      if (fileMatchesDetails.length > 0) {
        finalResults.push({ filePath: entry.relativePath, fileName: entry.fileName, matches: fileMatchesDetails });
      }
    }
    return finalResults;
  },

  // ─── User Data Export/Import/Reset ──────────────────────────────────────────
  exportUserData: async () => {
    const data = {};
    for (const [key, lsKey] of Object.entries(LS)) {
      data[key] = lsGet(lsKey, LS_OBJECT_KEYS.has(key) ? {} : []);
    }
    return data;
  },

  importUserData: async (userData) => {
    for (const [key, lsKey] of Object.entries(LS)) {
      if (userData[key] !== undefined) {
        lsSet(lsKey, userData[key]);
      }
    }
    return { success: true, message: 'נתונים יובאו בהצלחה.' };
  },

  resetAllUserData: async () => {
    for (const lsKey of Object.values(LS)) {
      localStorage.removeItem(lsKey);
    }
    return { success: true, message: 'כל הנתונים אופסו בהצלחה.' };
  },
};

export default WebApiService;

// backend/services/SmartSearchService.js
const fs = require('fs').promises;
const path = require('path');
const fg = require('fast-glob');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const TEXT_EXTENSIONS = [
    '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.less',
    '.xml', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log', '.sh', '.bash', '.py', '.rb', '.php',
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.swift', '.kt', '.kts', '.dart',
    '.vue', '.svelte', '.pl', '.pm', '.tcl', '.vb', '.vbs', '.csv', '.tsv', '.rtf', '.tex', '.text'
];

const EXCLUDE_PATTERNS = [
    'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**',
    '.vscode/**', '.idea/**', '*.lock',
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.bmp', '*.ico', '*.webp', '*.svg',
    '*.mp3', '*.wav', '*.ogg', '*.flac', '*.mp4', '*.mov', '*.avi', '*.mkv',
    '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt', '*.pptx',
    '*.zip', '*.tar', '*.gz', '*.rar', '*.7z',
    '*.exe', '*.dll', '*.so', '*.app', '*.dmg',
    '*.class', '*.jar', '*.pyc', '*.pyd', '*.o', '*.a',
    '*.DS_Store'
];

const GOOGLE_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

// ============================================================
//  UTILITY HELPERS
// ============================================================

/**
 * Strip internal fields (like _content) from result objects before sending to client.
 */
function stripInternalFields(results) {
    if (!Array.isArray(results)) return results;
    return results.map(({ _content, ...rest }) => rest);
}

function cleanAIResponseForJSON(responseText) {
    if (!responseText || typeof responseText !== 'string') {
        throw new Error('Invalid response text provided');
    }
    let cleaned = responseText.trim();
    cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    cleaned = cleaned.trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) cleaned = jsonMatch[0];
    return cleaned;
}

/**
 * Extract meaningful keywords from a Hebrew/English query.
 * Strips common Hebrew stop-words and returns unique tokens.
 */
function extractKeywords(query) {
    const hebrewStopWords = new Set([
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

    const raw = query
        .replace(/["""״׳'`\-–—,.;:!?()[\]{}<>\/\\@#$%^&*+=~|]/g, ' ')
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 1 && !hebrewStopWords.has(w));

    return [...new Set(raw)];
}

/**
 * Remove Hebrew prefix letters (ב, ה, ו, כ, ל, מ, ש) to get the root form.
 */
function removeHebrewPrefixes(word) {
    const prefixes = /^[בהוכלמש]/;
    if (word.length > 3 && prefixes.test(word)) {
        return [word, word.slice(1)];
    }
    return [word];
}

// ============================================================
//  LAYER 1 — LOCAL INTELLIGENCE  (0 AI calls)
// ============================================================

/**
 * Discover all text files in the workspace via fast-glob.
 */
async function discoverFiles(workspacePath) {
    const globPatterns = TEXT_EXTENSIONS.map(ext => `**/*${ext}`);
    const files = await fg(globPatterns, {
        cwd: workspacePath,
        dot: true,
        ignore: EXCLUDE_PATTERNS,
        onlyFiles: true,
        absolute: true,
        caseSensitiveMatch: false,
        followSymbolicLinks: false,
    });
    return files.map(abs => ({
        name: path.basename(abs),
        relativePath: path.relative(workspacePath, abs).replace(/\\/g, '/'),
        absolutePath: abs.replace(/\\/g, '/'),
    }));
}

/**
 * Score a file by how well its path/name matches the query keywords.
 * Returns a number 0-100.
 */
function scoreFileByPath(fileData, keywords) {
    const { name, relativePath } = fileData;
    const nameLower = name.toLowerCase();
    const pathLower = relativePath.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        const variants = removeHebrewPrefixes(kwLower);
        for (const variant of variants) {
            if (nameLower.includes(variant)) score += 30;
            else if (pathLower.includes(variant)) score += 15;
        }
    }
    return Math.min(score, 100);
}

/**
 * Search inside a single file for keyword matches.
 * Returns an array of match objects with context.
 * If fileData.content is already set (provided by frontend), skips fs.readFile.
 */
async function searchFileContent(fileData, keywords, workspacePath) {
    // Use != null so that empty-string content ("") is treated as "already have content"
    // and we don't fall through to the fs.readFile path with a possibly-null workspacePath.
    const hasProvidedContent = fileData.content != null;
    let content = hasProvidedContent ? fileData.content : null;

    if (!hasProvidedContent) {
        if (!workspacePath) {
            return { matches: [], totalScore: 0, content: null };
        }
        const absolutePath = path.isAbsolute(fileData.absolutePath)
            ? fileData.absolutePath
            : path.join(workspacePath, fileData.relativePath);

        try {
            content = await fs.readFile(absolutePath, 'utf-8');
        } catch {
            return { matches: [], totalScore: 0, content: null };
        }
    }

    if (!content) {
        // Empty file — no matches possible
        return { matches: [], totalScore: 0, content };
    }

    const lines = content.split('\n');
    const matches = [];
    let totalScore = 0;

    // Build an array of all keyword variants for matching
    const allVariants = [];
    for (const kw of keywords) {
        for (const v of removeHebrewPrefixes(kw.toLowerCase())) {
            allVariants.push(v);
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        let lineScore = 0;
        const matchedKeywords = [];

        for (const variant of allVariants) {
            if (lineLower.includes(variant)) {
                lineScore += 10;
                matchedKeywords.push(variant);
            }
        }

        if (lineScore > 0) {
            // Bonus for multiple keywords on same line (proximity)
            if (matchedKeywords.length > 1) {
                lineScore += matchedKeywords.length * 5;
            }

            const contextStart = Math.max(0, i - 2);
            const contextEnd = Math.min(lines.length - 1, i + 2);
            const context = lines.slice(contextStart, contextEnd + 1).join('\n');

            matches.push({
                lineNumber: i + 1,
                lineText: lines[i],
                context,
                score: lineScore,
                matchedKeywords,
            });
            totalScore += lineScore;
        }
    }

    // Sort matches within the file by score
    matches.sort((a, b) => b.score - a.score);

    return { matches: matches.slice(0, 5), totalScore, content };
}

/**
 * Layer 1 main: Local keyword search across the workspace.
 * Returns ranked results WITHOUT using AI.
 * If providedFiles is given (from browser File System Access API),
 * uses those instead of discovering files from disk.
 */
async function localSearch(workspacePath, query, providedFiles = null) {
    const keywords = extractKeywords(query);
    if (keywords.length === 0) {
        return { results: [], filesScanned: 0, keywords: [] };
    }

    // Use provided files or discover them from disk
    let allFiles;
    if (providedFiles && providedFiles.length > 0) {
        allFiles = providedFiles.map(f => ({
            name: f.name || f.path.split('/').pop(),
            relativePath: f.path,
            absolutePath: f.path,
            content: f.content,
        }));
    } else {
        allFiles = await discoverFiles(workspacePath);
    }
    if (allFiles.length === 0) {
        return { results: [], filesScanned: 0, keywords };
    }

    // 2. Score by path/name first to prioritise promising files
    const scored = allFiles.map(f => ({ ...f, pathScore: scoreFileByPath(f, keywords) }));
    scored.sort((a, b) => b.pathScore - a.pathScore);

    // 3. Search inside files
    // When content is already in memory (browser-provided), scan ALL files — no I/O cost.
    // When reading from disk, cap at 50 to avoid performance issues.
    const filesToScan = (providedFiles && providedFiles.length > 0) ? scored : scored.slice(0, 50);
    const fileResults = [];

    for (const fileData of filesToScan) {
        const { matches, totalScore, content } = await searchFileContent(fileData, keywords, workspacePath);
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

    // 4. Sort by combined score
    fileResults.sort((a, b) => b.combinedScore - a.combinedScore);

    // 5. Build result objects
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
            _content: fr.content || null, // Keep content for aiDeepAnalysis (stripped before returning to client)
        };
    });

    return {
        results,
        filesScanned: filesToScan.length,
        totalFiles: allFiles.length,
        keywords,
    };
}

// ============================================================
//  LAYER 2 — AI DEEP ANALYSIS  (1 Gemini call)
// ============================================================

/**
 * Takes the top local-search results and asks AI to find the best answer
 * with context, explanation, and related terms.
 * Uses exactly ONE API call.
 */
async function aiDeepAnalysis(localResults, query, model, apiKey, workspacePath) {
    // Pick top 5 files from local results that have content
    const topFiles = localResults.results
        .filter(r => r.score > 0)
        .slice(0, 5);

    if (topFiles.length === 0) {
        return null;
    }

    // Read content for the top files — use _content from localSearch if available
    const filesWithContent = [];
    for (const result of topFiles) {
        // Use != null so empty-string content is treated as valid (avoids path.join with null)
        const hasProvidedContent = result._content != null;
        let content = hasProvidedContent ? result._content : null;
        if (!hasProvidedContent) {
            if (!workspacePath) continue; // can't read from disk without a path
            const absPath = path.join(workspacePath, result.sourceFile);
            try {
                content = await fs.readFile(absPath, 'utf-8');
            } catch {
                continue; // skip unreadable
            }
        }
        // Trim to first 3000 chars to save tokens
        filesWithContent.push({
            filePath: result.sourceFile,
            content: content.length > 3000 ? content.substring(0, 3000) + '\n... (קובץ קוצר)' : content,
        });
    }

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
        const fetch = require('node-fetch');
        const response = await fetch(`${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            agent: httpsAgent,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI Deep Analysis API Error:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) return null;

        const cleaned = cleanAIResponseForJSON(textResponse);
        const parsed = JSON.parse(cleaned);

        // Validate sourceFile references
        const validPaths = new Set(filesWithContent.map(f => f.filePath));
        if (parsed.results && Array.isArray(parsed.results)) {
            parsed.results = parsed.results.filter(r =>
                r.sourceFile && validPaths.has(r.sourceFile)
            );
        }

        return parsed;
    } catch (error) {
        console.error('AI Deep Analysis error:', error);
        return null;
    }
}

// ============================================================
//  LAYER 2b — AI DIRECT SEMANTIC SEARCH  (1 Gemini call)
// ============================================================

/**
 * AI-powered direct scan — sends compact file previews to Gemini and asks it to
 * semantically find what the user is looking for. Runs even when local keyword
 * search completely fails (e.g. Hebrew conjugation mismatches).
 *
 * Strategy: file name + first 600 chars of each file → one API call → AI identifies
 * relevant files and extracts quotes. Stays well within free-tier limits
 * (80 files × 600 chars ≈ 12 000 tokens vs Gemini Flash's 1 M token context).
 */
async function aiDirectSearch(allFiles, query, model, apiKey) {
    if (!allFiles || allFiles.length === 0) return null;

    const MAX_FILES = 80;
    const PREVIEW_CHARS = 600;

    const filesWithContent = allFiles
        .filter(f => f.content && f.content.trim().length > 20)
        .slice(0, MAX_FILES);

    if (filesWithContent.length === 0) return null;

    // Build compact catalog: [index] path \n preview
    const catalog = filesWithContent.map((f, i) => {
        const filePath = f.relativePath || f.path || `file_${i}`;
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
        const fetch = require('node-fetch');
        const response = await fetch(`${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            agent: httpsAgent,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI Direct Search API Error:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) return null;

        const cleaned = cleanAIResponseForJSON(textResponse);
        const parsed = JSON.parse(cleaned);

        if (!parsed.results || parsed.results.length === 0) return null;

        // Map fileIndex back to actual file paths
        const validResults = parsed.results
            .filter(r => typeof r.fileIndex === 'number' && r.fileIndex >= 0 && r.fileIndex < filesWithContent.length)
            .map(r => {
                const fileData = filesWithContent[r.fileIndex];
                const filePath = fileData.relativePath || fileData.path;
                return {
                    sourceFile: filePath,
                    fileName: filePath.split('/').pop(),
                    quote: r.quote || '',
                    explanation: r.explanation || '',
                    relevanceScore: r.relevanceScore || 80,
                };
            });

        if (validResults.length === 0) return null;

        return {
            results: validResults,
            relatedTerms: parsed.relatedTerms || [],
            summary: parsed.summary || '',
        };
    } catch (error) {
        console.error('AI Direct Search error:', error);
        return null;
    }
}

// ============================================================
//  MAIN ORCHESTRATOR
// ============================================================

/**
 * Performs a multi-layer smart search.
 *
 * Mode "local"  → Layer 1 only (instant, 0 AI calls)
 * Mode "deep"   → Layer 1 + Layer 2 (1 AI call)
 * Default mode  → "deep"
 */
async function performSmartSearch(workspacePath, userQuery, numFilesToScan, model, apiKey, mode = 'deep', providedFiles = null) {
    const startTime = Date.now();

    // --- Layer 1: Local keyword search ---
    let localResults;
    try {
        localResults = await localSearch(workspacePath, userQuery, providedFiles);
    } catch (error) {
        console.error('Smart Search Layer 1 error:', error);
        return {
            notFound: true,
            reason: `שגיאה בחיפוש מקומי: ${error.message}`,
        };
    }

    // If mode is local-only, return results immediately
    if (mode === 'local') {
        if (localResults.results.length === 0) {
            return {
                notFound: true,
                reason: 'לא נמצאו תוצאות מתאימות לחיפוש.',
                keywords: localResults.keywords,
                filesScanned: localResults.filesScanned,
                totalFiles: localResults.totalFiles,
                mode: 'local',
            };
        }
        return {
            found: true,
            mode: 'local',
            results: stripInternalFields(localResults.results),
            keywords: localResults.keywords,
            filesScanned: localResults.filesScanned,
            totalFiles: localResults.totalFiles,
            duration: Date.now() - startTime,
        };
    }

    // --- Layer 2: AI deep analysis ---
    // We always run AI in 'deep' mode. Two strategies depending on local results:
    //   A) Local found keyword matches  → aiDeepAnalysis (focused: top-5 files with full content)
    //   B) Local found nothing (Hebrew conjugation mismatch, etc.) → aiDirectSearch (semantic catalog scan)

    const filesHaveContentMatches = localResults.results.some(r => r.matchCount > 0);

    // Strategy A: local keyword matches found — AI analyzes those specific files
    if (filesHaveContentMatches) {
        try {
            const aiResult = await aiDeepAnalysis(localResults, userQuery, model, apiKey, workspacePath);
            if (aiResult && aiResult.results && aiResult.results.length > 0) {
                return {
                    found: true,
                    mode: 'deep',
                    results: aiResult.results.map(r => ({
                        ...r,
                        sourceFile: r.sourceFile,
                        fileName: path.basename(r.sourceFile),
                    })),
                    relatedTerms: aiResult.relatedTerms || [],
                    summary: aiResult.summary || '',
                    localResults: stripInternalFields(localResults.results.slice(0, 5)),
                    keywords: localResults.keywords,
                    filesScanned: localResults.filesScanned,
                    totalFiles: localResults.totalFiles,
                    duration: Date.now() - startTime,
                };
            }
        } catch (error) {
            console.error('Smart Search Layer 2 (analysis) error:', error);
            // Fall through to direct semantic search
        }
    }

    // Strategy B: No keyword matches (or AI analysis failed) — AI does a full semantic scan
    // This handles: Hebrew conjugation mismatches, concept-based queries, synonym gaps
    if (providedFiles && providedFiles.length > 0) {
        try {
            const directResult = await aiDirectSearch(providedFiles, userQuery, model, apiKey);
            if (directResult && directResult.results && directResult.results.length > 0) {
                return {
                    found: true,
                    mode: 'deep',
                    results: directResult.results,
                    relatedTerms: directResult.relatedTerms || [],
                    summary: directResult.summary || '',
                    keywords: localResults.keywords,
                    filesScanned: providedFiles.length,
                    totalFiles: providedFiles.length,
                    duration: Date.now() - startTime,
                };
            }
        } catch (error) {
            console.error('Smart Search Layer 2 (direct) error:', error);
        }
    }

    // Local-only fallback if we had any path-score matches
    if (localResults.results.length > 0) {
        return {
            found: true,
            mode: 'local-fallback',
            results: stripInternalFields(localResults.results),
            keywords: localResults.keywords,
            filesScanned: localResults.filesScanned,
            totalFiles: localResults.totalFiles,
            duration: Date.now() - startTime,
        };
    }

    // Nothing found at all
    return {
        notFound: true,
        reason: 'לא נמצאו תוצאות מתאימות לחיפוש. נסה לצמצם את השאילתה או לוודא שהקבצים נטענו.',
        keywords: localResults.keywords,
        filesScanned: localResults.filesScanned,
        totalFiles: localResults.totalFiles,
        mode: mode,
        duration: Date.now() - startTime,
    };
}

// ============================================================
//  SIMPLE TEXT SEARCH (no AI, pure grep-like)
// ============================================================

/**
 * Simple text search across all files in workspace.
 * Supports searching in specific files/folders via optional filterPaths.
 * Case-insensitive. Returns all matches with context.
 */
async function performSimpleSearch(workspacePath, searchText, filterPaths = null, caseSensitive = false, wholeWord = false, providedFiles = null) {
    if (!searchText || !searchText.trim()) {
        return { results: [], totalMatches: 0, filesSearched: 0 };
    }

    let allFiles;
    if (providedFiles && providedFiles.length > 0) {
        allFiles = providedFiles.map(f => ({
            name: f.name || f.path.split('/').pop(),
            relativePath: f.path,
            absolutePath: f.path,
            content: f.content,
        }));
    } else {
        allFiles = await discoverFiles(workspacePath);
    }
    
    // If filterPaths provided, only search within those
    let filesToSearch = allFiles;
    if (filterPaths && filterPaths.length > 0) {
        filesToSearch = allFiles.filter(f => {
            return filterPaths.some(fp => {
                const fpNorm = fp.replace(/\\/g, '/');
                return f.relativePath === fpNorm || f.relativePath.startsWith(fpNorm + '/');
            });
        });
    }

    const results = [];
    let totalMatches = 0;

    const searchLower = caseSensitive ? searchText : searchText.toLowerCase();
    
    // Build regex for whole word matching
    let searchRegex = null;
    if (wholeWord) {
        const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchRegex = new RegExp(`(?:^|[\\s.,;:!?()\\[\\]{}"\\'\\-])${escaped}(?:[\\s.,;:!?()\\[\\]{}"\\'\\-]|$)`, caseSensitive ? 'g' : 'gi');
    }

    for (const fileData of filesToSearch) {
        const hasProvidedContent = fileData.content != null;
        let content = hasProvidedContent ? fileData.content : null;
        if (!hasProvidedContent) {
            if (!workspacePath) continue;
            try {
                content = await fs.readFile(fileData.absolutePath, 'utf-8');
            } catch {
                continue;
            }
        }
        if (!content) continue; // empty file

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
                fileMatches.push({
                    lineNumber: i + 1,
                    lineText: line,
                    context: lines.slice(contextStart, contextEnd + 1).join('\n'),
                });
                totalMatches++;
            }
        }

        if (fileMatches.length > 0) {
            results.push({
                relativePath: fileData.relativePath,
                fileName: fileData.name,
                matches: fileMatches,
                matchCount: fileMatches.length,
            });
        }
    }

    // Sort: most matches first
    results.sort((a, b) => b.matchCount - a.matchCount);

    return {
        results,
        totalMatches,
        filesSearched: filesToSearch.length,
        totalFiles: allFiles.length,
        searchText,
    };
}

/**
 * פונקציה לארגון טקסט באמצעות בינה מלאכותית
 * @param {string} text - הטקסט לארגון
 * @param {string} prompt - הפרומפט להנחיית הבינה המלאכותית
 * @param {string} model - מודל הבינה המלאכותית
 * @param {string} apiKey - מפתח API
 * @returns {Promise<string>} - הטקסט המאורגן
 */
/**
 * בונה prompt לקטע בודד — הוראה מחמירה: מבנה בלבד, ללא סיכום
 */
function buildChunkPrompt(chunkIndex, totalChunks, chunkText) {
    return `אתה עורך טקסט עברי. עליך לטפל בקטע ${chunkIndex} מתוך ${totalChunks} של המסמך.

✅ מה לעשות — הוסף מבנה בלבד:
• הוסף כותרת ## לתחילת כל נושא/רעיון חדש שמתחיל בקטע זה
• המר סדרות פריטים לרשימות (- פריט)
• חלק לפסקאות במקום שיש מעבר רעיוני
• הוסף שורה ריקה בין פסקאות

❌ אסור בהחלט:
• לסכם, לקצר, להשמיט או לשנות תוכן כלשהו
• להוסיף מידע חדש שאינו בטקסט
• לשנות ניסוחים, מילים או סדר משפטים
• להוסיף הסברים, אזהרות, הערות משלך

החזר את כל הטקסט הבא כולו, עם הוספת מבנה בלבד — שמור כל מילה:
---
${chunkText}
---`;
}

/**
 * קריאה ל-AI לקטע בודד (Google)
 */
async function callGoogleAIForChunk(chunkText, chunkPrompt, model, apiKey) {
    const fetch = require('node-fetch');
    const url = `${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`;
    const tokenEstimate = Math.ceil(chunkText.length / 3);
    const maxTokens = Math.max(tokenEstimate * 2, 4096);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: chunkPrompt }] }],
            generationConfig: {
                temperature: 0.05,
                maxOutputTokens: maxTokens,
                topP: 0.9,
                topK: 40,
                candidateCount: 1,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ]
        }),
        agent: httpsAgent,
        timeout: 120000
    });

    const responseText = await response.text();
    if (!response.ok) throw new Error(`Google AI API שגיאה: ${response.status} - ${responseText}`);
    const data = JSON.parse(responseText);
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) throw new Error('תגובה ריקה מ-Google AI API');
    return result.trim();
}

/**
 * קריאה ל-AI לקטע בודד (OpenAI)
 */
async function callOpenAIForChunk(chunkText, chunkPrompt, model, apiKey) {
    const tokenEstimate = Math.ceil(chunkText.length / 3);
    const maxTokens = Math.max(tokenEstimate * 2, 2048);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: chunkPrompt }],
            max_tokens: maxTokens,
            temperature: 0.05,
            top_p: 0.9,
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API שגיאה: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;
    if (!result) throw new Error('תגובה ריקה מ-OpenAI API');
    return result.trim();
}

/**
 * ארגון טקסט בגישת קטעים — מעבד כל קטע בנפרד ומחבר בחזרה.
 * כל קריאה ל-AI מקבלת רק קטע קטן + הוראה קשיחה: מבנה בלבד, ללא סיכום.
 */
async function organizeTextWithChunks(text, model, apiKey, onChunkProgress) {
    const isGoogleModel = model && (model.includes('gemini') || model.includes('palm'));
    const chunks = await divideTextIntoChunks(text, model, apiKey);
    const total = chunks.length;
    console.log(`ארגון בגישת קטעים: ${total} קטעים, מודל: ${model}`);

    const organizedChunks = [];
    for (let i = 0; i < total; i++) {
        const chunkPrompt = buildChunkPrompt(i + 1, total, chunks[i]);
        console.log(`מעבד קטע ${i + 1}/${total} (${chunks[i].split('\n').length} שורות)...`);
        if (onChunkProgress) onChunkProgress(i, total);

        let organized;
        if (isGoogleModel) {
            organized = await callGoogleAIForChunk(chunks[i], chunkPrompt, model, apiKey);
        } else {
            organized = await callOpenAIForChunk(chunks[i], chunkPrompt, model, apiKey);
        }

        // strip any wrapping fences the AI may have added (```...```)
        organized = organized.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
        organizedChunks.push(organized);
    }

    return organizedChunks.join('\n\n');
}

async function organizeText(text, prompt, model = 'gpt-4', apiKey, onChunkProgress) {
    if (!text || !text.trim()) {
        throw new Error('שגיאה: נדרש טקסט לארגון');
    }

    const startTime = Date.now();
    const isGoogleModel = model && (model.includes('gemini') || model.includes('palm'));

    try {
        const lines = text.split('\n');
        console.log(`התחלת ארגון טקסט - מספר שורות: ${lines.length}, מודל: ${model}`);

        let organizedText;

        if (lines.length > 100) {
            // גישת קטעים: מעבד כל קטע בנפרד — לא מסכם, רק מוסיף מבנה
            organizedText = await organizeTextWithChunks(text, model, apiKey, onChunkProgress);
        } else {
            // טקסט קצר — קריאה בודדת עם prompt מחמיר
            const singlePrompt = buildChunkPrompt(1, 1, text);
            if (isGoogleModel) {
                organizedText = await callGoogleAIForChunk(text, singlePrompt, model, apiKey);
            } else {
                organizedText = await callOpenAIForChunk(text, singlePrompt, model, apiKey);
            }
            organizedText = organizedText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
        }

        const endTime = Date.now();
        console.log(`ארגון טקסט הושלם בתוך ${(endTime - startTime) / 1000} שניות`);

        // בדיקה סופית
        const originalSig = text.split('\n').filter(l => l.trim()).length;
        const organizedSig = organizedText.split('\n').filter(l => l.trim()).length;
        if (organizedSig < originalSig * 0.8) {
            console.warn(`⚠️ אזהרה סופית: שורות מקור ${originalSig}, שורות מאורגנות ${organizedSig}`);
        }

        return organizedText;

    } catch (error) {
        const endTime = Date.now();
        console.error(`שגיאה בארגון טקסט אחרי ${(endTime - startTime) / 1000} שניות:`, error);
        throw new Error(`שגיאה בארגון הטקסט: ${error.message}`);
    }
}

/**
 * קריאה ל-OpenAI לארגון טקסט - גרסה מותאמת לטקסטים גדולים
 */
async function callOpenAIForTextOrganizationOptimized(text, prompt, model, apiKey, lineCount) {
    const systemPrompt = prompt || `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט שהמשתמש יספק בהודעה הבאה.

🔥 CRITICAL - חוקים שאסור לעבור עליהם:
• שמור על כל התוכן המקורי ללא יוצא מהכלל - כולל השורות האחרונות!
• אל תמחק, תקצר, או תחסיר שום מידע מהטקסט המקורי
• אל תחתוך את הטקסט באמצע או בסוף - הכל חייב להישמר
• ודא שהטקסט המאורגן מכיל בדיוק את כל המילים והמשפטים מהמקור
• השורות האחרונות בטקסט המקורי חייבות להופיע גם בטקסט המאורגן
• אל תחליף את התוכן בנושא אחר - רק ארגן את מה שכבר קיים!
• אסור לך ליצור תוכן חדש על תיקון מידות או נושאים אחרים!

⚠️ אזהרה חשובה: 
המשתמש רוצה לארגן את הטקסט שלו, לא לקבל תוכן חדש על נושא אחר!
אל תחליף את התוכן המקורי בתוכן על נושאים כמו תיקון מידות או כל נושא אחר!

📋 משימות הארגון:
1. ארגן כותרות בהיררכיה ברורה (H1, H2, H3) על פי התוכן הקיים
2. חלק לפסקאות לוגיות ומובנות את התוכן הקיים
3. שפר את הקריאות והזרימה של הטקסט הקיים
4. השתמש בפורמט Markdown מתאים (כותרות, רשימות, הדגשות)
5. ארגן רשימות בצורה מסודרת
6. אל תחזור על תוכן - כל חלק צריך להופיע פעם אחת בלבד
7. וודא שכל השורות האחרונות נכללות במלואן

החזר אך ורק את הטקסט המאורגן המלא ללא הסברים נוספים, חתכים או קיצורים.
🚨 חשוב מאוד: שמור על כל התוכן במלואו! אל תחתוך או תקצר שום דבר!
🚨 זכור: המטרה היא לארגן את הטקסט שהמשתמש יספק, לא ליצור תוכן חדש!
🚨 הקפד במיוחד על השורות האחרונות - הן חייבות להיכלל במלואן!

הטקסט לארגון (${lineCount} שורות, ${text.length} תווים):
---
${text}
---

אנא ארגן את הטקסט שלמעלה במלואו. חשוב: שמור על כל התוכן, כולל השורות האחרונות:
${text.split('\n').slice(-3).join('\n')}

תן דעתך במיוחד לשמור על השורות האחרונות הללו!`;

    // הגדרות מותאמות לגודל הטקסט - הגדלת הטוקנים משמעותית לטקסטים גדולים
    // חישוב דינמי של maxTokens בהתבסס על גודל הטקסט בפועל
    const textTokensEstimate = Math.ceil(text.length / 3); // הערכה גסה של מספר טוקנים בטקסט
    const minOutputTokens = textTokensEstimate * 1.5; // לפחות 150% מהטקסט המקורי
    const maxTokens = Math.max(minOutputTokens, lineCount > 500 ? 60000 : lineCount > 300 ? 45000 : lineCount > 200 ? 35000 : lineCount > 100 ? 25000 : 15000);
    
    console.log(`OpenAI: שורות: ${lineCount}, טוקנים משוערים בטקסט: ${textTokensEstimate}, maxTokens: ${maxTokens}`);
    
    const isLargeText = lineCount > 100;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `אנא ארגן את הטקסט הבא (${lineCount} שורות). שמור על כל התוכן המקורי ורק ארגן אותו:

${text}`
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.1, // נמוך יותר לעקביות
            top_p: 0.9,
            frequency_penalty: 0.3, // מונע חזרות
            presence_penalty: 0.1,
            ...(isLargeText && {
                stream: false, // וודא שאין streaming לטקסטים גדולים
                timeout: 300000 // 5 דקות timeout במקום 2
            })
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API שגיאה: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
        const organizedText = data.choices[0].message.content.trim();
        
        // בדיקת אימות משופרת שהתוכן לא נחתך
        const originalWords = text.split(/\s+/).filter(word => word.length > 0).length;
        const organizedWords = organizedText.split(/\s+/).filter(word => word.length > 0).length;
        const wordsRatio = organizedWords / originalWords;
        
        // בדיקת אורך הטקסט גם בתווים
        const originalChars = text.replace(/\s/g, '').length;
        const organizedChars = organizedText.replace(/\s/g, '').length;
        const charsRatio = organizedChars / originalChars;
        
        console.log(`אימות תוכן: מילים במקור: ${originalWords}, מילים מאורגנות: ${organizedWords}, יחס מילים: ${(wordsRatio * 100).toFixed(1)}%`);
        console.log(`אימות תוכן: תווים במקור: ${originalChars}, תווים מאורגנים: ${organizedChars}, יחס תווים: ${(charsRatio * 100).toFixed(1)}%`);
        
        // אם יחס המילים או התווים נמוך מדי, זה יכול להצביע על חיתוך
        if (wordsRatio < 0.85 || charsRatio < 0.85) {
            console.warn(`⚠️ אזהרה: הטקסט המאורגן נראה קצר משמעותית מהמקור - מילים: ${(wordsRatio * 100).toFixed(1)}%, תווים: ${(charsRatio * 100).toFixed(1)}%`);
            
            // בדיקה האם השורות האחרונות מהטקסט המקורי מופיעות בטקסט המאורגן
            const originalLines = text.split('\n').filter(line => line.trim().length > 0);
            const lastOriginalLines = originalLines.slice(-3).map(line => line.trim()); // 3 השורות האחרונות
            
            let missingLastLines = 0;
            for (const lastLine of lastOriginalLines) {
                if (lastLine.length > 5 && !organizedText.includes(lastLine)) { // בדיקה רק לשורות משמעותיות
                    missingLastLines++;
                    console.warn(`⚠️ שורה אחרונה חסרה: "${lastLine}"`);
                }
            }
            
            if (missingLastLines > 0) {
                console.error(`❌ שגיאה: ${missingLastLines} מהשורות האחרונות חסרות בטקסט המאורגן!`);
                // אל תזרוק שגיאה - פשוט תן אזהרה והחזר את התוצאה
            }
        }
        
        return organizedText;
    } else {
        throw new Error('תגובה לא תקינה מ-OpenAI API');
    }
}

/**
 * קריאה ל-Google AI לארגון טקסט - גרסה מותאמת לטקסטים גדולים
 */
async function callGoogleAIForTextOrganizationOptimized(text, prompt, model, apiKey, lineCount) {
    const combinedPrompt = (prompt || `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט שאספק לך.

🔥 CRITICAL - חוקים שאסור לעבור עליהם:
• שמור על כל התוכן המקורי ללא יוצא מהכלל - כולל השורות האחרונות!
• אל תמחק, תקצר, או תחסיר שום מידע מהטקסט המקורי
• אל תחתוך את הטקסט באמצע או בסוף - הכל חייב להישמר
• ודא שהטקסט המאורגן מכיל בדיוק את כל המילים והמשפטים מהמקור
• השורות האחרונות בטקסט המקורי חייבות להופיע גם בטקסט המאורגן
• אל תחליף את התוכן בנושא אחר - רק ארגן את מה שכבר קיים!
• אסור לך ליצור תוכן חדש על תיקון מידות או נושאים אחרים!

⚠️ אזהרה חשובה: 
המשתמש רוצה לארגן את הטקסט שלו, לא לקבל תוכן חדש על נושא אחר!
אל תחליף את התוכן המקורי בתוכן על נושאים כמו תיקון מידות או כל נושא אחר!

📋 משימות הארגון:
1. ארגן כותרות בהיררכיה ברורה (H1, H2, H3) על פי התוכן הקיים
2. חלק לפסקאות לוגיות ומובנות את התוכן הקיים
3. שפר את הקריאות והזרימה של הטקסט הקיים
4. השתמש בפורמט Markdown מתאים (כותרות, רשימות, הדגשות)
5. ארגן רשימות בצורה מסודרת
6. אל תחזור על תוכן - כל חלק צריך להופיע פעם אחת בלבד
7. וודא שכל השורות האחרונות נכללות במלואן

החזר אך ורק את הטקסט המאורגן המלא ללא הסברים נוספים, חתכים או קיצורים.
🚨 חשוב מאוד: שמור על כל התוכן במלואו! אל תחתוך או תקצר שום דבר!
🚨 זכור: המטרה היא לארגן את הטקסט הקיים, לא ליצור תוכן חדש!
🚨 הקפד במיוחד על השורות האחרונות - הן חייבות להיכלל במלואן!
`) + `

הטקסט לארגון (${lineCount} שורות, ${text.length} תווים):
---
${text}
---

אנא ארגן את הטקסט שלמעלה במלואו. חשוב: שמור על כל התוכן, כולל השורות האחרונות:
${text.split('\n').slice(-3).join('\n')}

תן דעתך במיוחד לשמור על השורות האחרונות הללו!`;

    // הגדרות מותאמות לגודל הטקסט - הגדלת הטוקנים משמעותית לטקסטים גדולים
    // חישוב דינמי של maxTokens בהתבסס על גודל הטקסט בפועל
    const textTokensEstimate = Math.ceil(text.length / 3); // הערכה גסה של מספר טוקנים בטקסט
    const minOutputTokens = textTokensEstimate * 1.5; // לפחות 150% מהטקסט המקורי
    const maxTokens = Math.max(minOutputTokens, lineCount > 500 ? 60000 : lineCount > 300 ? 45000 : lineCount > 200 ? 35000 : lineCount > 100 ? 25000 : 15000);
    
    console.log(`Google AI: שורות: ${lineCount}, טוקנים משוערים בטקסט: ${textTokensEstimate}, maxTokens: ${maxTokens}`);

    const url = `${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`;
    
    const fetch = require('node-fetch');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: combinedPrompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1, // נמוך יותר לעקביות
                maxOutputTokens: maxTokens,
                topP: 0.9,
                topK: 40,
                candidateCount: 1, // רק מועמד אחד
                stopSequences: [] // אל תעצור באמצע
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        }),
        agent: httpsAgent,
        timeout: 300000 // 5 דקות timeout במקום 2
    });

    let responseText;
    try {
        responseText = await response.text();
    } catch (textError) {
        console.error('Failed to read response text:', textError);
        throw new Error(`שגיאה בקריאת תשובת Google AI API: ${textError.message}`);
    }

    if (!response.ok) {
        console.error(`Google AI API Error: ${response.status} - ${responseText}`);
        
        // Try to parse error as JSON for better error details
        let errorDetails = responseText;
        try {
            const errorData = JSON.parse(responseText);
            errorDetails = errorData.error?.message || responseText;
        } catch (parseError) {
            // If we can't parse as JSON, use the raw text
            console.warn('Could not parse error response as JSON:', parseError);
        }
        
        throw new Error(`Google AI API שגיאה: ${response.status} - ${errorDetails}`);
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (jsonError) {
        console.error('Failed to parse response as JSON. Raw response:', responseText);
        throw new Error(`שגיאה בפיענוח תשובת Google AI API: התקבלה תשובה לא תקינה. ייתכן שהמפתח API לא תקין או שיש בעיית רשת.`);
    }
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const organizedText = data.candidates[0].content.parts[0].text.trim();
        
        // בדיקת אימות משופרת שהתוכן לא נחתך
        const originalWords = text.split(/\s+/).filter(word => word.length > 0).length;
        const organizedWords = organizedText.split(/\s+/).filter(word => word.length > 0).length;
        const wordsRatio = organizedWords / originalWords;
        
        // בדיקת אורך הטקסט גם בתווים
        const originalChars = text.replace(/\s/g, '').length;
        const organizedChars = organizedText.replace(/\s/g, '').length;
        const charsRatio = organizedChars / originalChars;
        
        console.log(`אימות תוכן Google AI: מילים במקור: ${originalWords}, מילים מאורגנות: ${organizedWords}, יחס מילים: ${(wordsRatio * 100).toFixed(1)}%`);
        console.log(`אימות תוכן Google AI: תווים במקור: ${originalChars}, תווים מאורגנים: ${organizedChars}, יחס תווים: ${(charsRatio * 100).toFixed(1)}%`);
        
        // אם יחס המילים או התווים נמוך מדי, זה יכול להצביע על חיתוך
        if (wordsRatio < 0.85 || charsRatio < 0.85) {
            console.warn(`⚠️ אזהרה: הטקסט המאורגן נראה קצר משמעותית מהמקור - מילים: ${(wordsRatio * 100).toFixed(1)}%, תווים: ${(charsRatio * 100).toFixed(1)}%`);
            
            // בדיקה האם השורות האחרונות מהטקסט המקורי מופיעות בטקסט המאורגן
            const originalLines = text.split('\n').filter(line => line.trim().length > 0);
            const lastOriginalLines = originalLines.slice(-3).map(line => line.trim()); // 3 השורות האחרונות
            
            let missingLastLines = 0;
            for (const lastLine of lastOriginalLines) {
                if (lastLine.length > 5 && !organizedText.includes(lastLine)) { // בדיקה רק לשורות משמעותיות
                    missingLastLines++;
                    console.warn(`⚠️ שורה אחרונה חסרה: "${lastLine}"`);
                }
            }
            
            if (missingLastLines > 0) {
                console.error(`❌ שגיאה: ${missingLastLines} מהשורות האחרונות חסרות בטקסט המאורגן!`);
                // אל תזרוק שגיאה - פשוט תן אזהרה והחזר את התוצאה
            }
        }
        
        return organizedText;
    } else {
        throw new Error('תגובה לא תקינה מ-Google AI API');
    }
}

/**
 * מחלק טקסט גדול לחלקים קטנים יותר בצורה חכמה ומהירה
 */
async function divideTextIntoChunks(text, model, apiKey) {
    const lines = text.split('\n');
    if (lines.length <= 80) {
        return [text]; // אם הטקסט קטן מ-80 שורות, החזר אותו כפי שהוא
    }

    console.log(`מתחיל חלוקה חכמה של טקסט עם ${lines.length} שורות`);
    
    // שלב 1: חלוקה מהירה לפי כותרות
    const smartChunks = divideByHeaders(lines);
    
    // שלב 2: אם יש חלקים גדולים מדי, חלק אותם עוד יותר
    const finalChunks = [];
    for (const chunk of smartChunks) {
        const chunkLines = chunk.split('\n');
        if (chunkLines.length <= 80) {
            finalChunks.push(chunk);
        } else {
            // חלק חלק גדול לחלקים קטנים יותר
            const subChunks = divideTextByLines(chunk, 70); // 70 במקום 80 כדי להשאיר מקום לחפיפה
            finalChunks.push(...subChunks);
        }
    }
    
    console.log(`הטקסט חולק ל-${finalChunks.length} חלקים`);
    return finalChunks;
}

/**
 * חלוקה חכמה של טקסט לפי כותרות
 */
function divideByHeaders(lines) {
    const chunks = [];
    let currentChunk = [];
    let linesInCurrentChunk = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // בדיקה אם השורה היא כותרת (מתחילה ב-# או מכילה מילות מפתח של כותרות)
        const isHeader = isHeaderLine(line, i > 0 ? lines[i-1] : '', i < lines.length - 1 ? lines[i+1] : '');
        
        // אם מצאנו כותרת והחלק הנוכחי מכיל יותר מ-40 שורות, התחל חלק חדש
        if (isHeader && linesInCurrentChunk > 40 && currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [];
            linesInCurrentChunk = 0;
        }
        
        // אם החלק הנוכחי מכיל יותר מ-80 שורות, חתוך אותו כפות
        if (linesInCurrentChunk >= 80) {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [];
            linesInCurrentChunk = 0;
        }
        
        currentChunk.push(lines[i]);
        linesInCurrentChunk++;
    }
    
    // הוסף את החלק האחרון
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }
    
    return chunks;
}

/**
 * בדיקה אם שורה היא כותרת
 */
function isHeaderLine(line, prevLine, nextLine) {
    if (!line || line.length === 0) return false;
    
    // כותרות Markdown
    if (line.startsWith('#')) return true;
    
    // כותרות עם מילות מפתח נפוצות
    const headerKeywords = [
        'פרק', 'חלק', 'סעיף', 'סימן', 'הלכה', 'משנה', 'גמרא', 'רש"י', 'תוספות',
        'שאלה', 'תשובה', 'מבוא', 'הקדמה', 'סיכום', 'סיום', 'ביאור', 'פירוש',
        'נושא', 'עניין', 'דיון', 'הסבר', 'הערה', 'הארה', 'חידוש', 'דקדוק'
    ];
    
    for (const keyword of headerKeywords) {
        if (line.includes(keyword) && (line.length < 100 || line.endsWith(':'))) {
            return true;
        }
    }
    
    // שורה קצרה שמסתיימת בנקודתיים
    if (line.endsWith(':') && line.length < 80 && !line.includes('.')) {
        return true;
    }
    
    // שורה שהיא מספר או אות בלבד (כותרת מסוג "א. " או "1. ")
    if (/^\s*[א-ת]\.\s*$|^\s*\d+\.\s*$/.test(line)) {
        return true;
    }
    
    return false;
}

/**
 * חלוקה פשוטה של טקסט לפי מספר שורות (כפתרון גיבוי) - משופרת
 */
function divideTextByLines(text, maxLines) {
    const lines = text.split('\n');
    const chunks = [];
    
    let currentChunk = [];
    for (let i = 0; i < lines.length; i++) {
        currentChunk.push(lines[i]);
        
        // אם הגענו לגבול השורות
        if (currentChunk.length >= maxLines) {
            // נסה לחתוך במקום טוב (שורה ריקה או כותרת)
            let cutPoint = currentChunk.length;
            for (let j = currentChunk.length - 1; j >= Math.max(0, currentChunk.length - 10); j--) {
                const line = currentChunk[j].trim();
                // אם מצאנו שורה ריקה או כותרת, חתוך שם
                if (line === '' || line.startsWith('#') || line.endsWith(':')) {
                    cutPoint = j + 1;
                    break;
                }
            }
            
            // חתוך את החלק הנוכחי
            const chunkToAdd = currentChunk.slice(0, cutPoint).join('\n');
            chunks.push(chunkToAdd);
            
            // התחל חלק חדש עם השורות שנותרו
            currentChunk = currentChunk.slice(cutPoint);
        }
    }
    
    // הוסף את השארית
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }
    
    return chunks;
}

/**
 * קריאה ל-Google AI לארגון טקסט
 */
async function callGoogleAIForTextOrganization(text, prompt, model, apiKey) {
    const systemPrompt = prompt || `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט הספציפי שהמשתמש סיפק ולא ליצור תוכן חדש.

🔥 CRITICAL - חוקים שאסור לעבור עליהם:
• שמור על כל התוכן המקורי ללא יוצא מהכלל
• אל תמחק, תקצר, או תחסיר שום מידע מהטקסט המקורי
• אל תחליף את התוכן בנושא אחר - רק ארגן את מה שכבר קיים!
• אסור לך ליצור תוכן חדש על תיקון מידות או נושאים אחרים!

⚠️ אזהרה חשובה: 
המשתמש רוצה לארגן את הטקסט שלו, לא לקבל תוכן חדש על נושא אחר!
אל תחליף את התוכן המקורי בתוכן על נושאים כמו תיקון מידות או כל נושא אחר!

📋 משימות הארגון:
1. ארגן כותרות בהיררכיה ברורה על פי התוכן הקיים למטה
2. חלק לפסקאות לוגיות את התוכן הקיים למטה
3. שפר את הקריאות והזרימה של הטקסט הקיים למטה
4. שמור על כל התוכן המקורי
5. השתמש בפורמט Markdown מתאים
6. החזר רק את הטקסט המאורגן ללא הסברים נוספים
7. אל תשנה את הנושא או התוכן - רק ארגן אותו!

הטקסט לארגון:
${text}

🚨 זכור: המטרה היא לארגן את הטקסט הקיים למעלה, לא ליצור תוכן חדש!
`;

    const url = `${GOOGLE_API_BASE_URL}${model}:generateContent?key=${apiKey}`;
    
    // Use node-fetch with custom agent for SSL issues
    const fetch = require('node-fetch');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: systemPrompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4000
            }
        }),
        agent: httpsAgent // Use our custom agent
    });

    let responseText;
    try {
        responseText = await response.text();
    } catch (textError) {
        console.error('Failed to read response text:', textError);
        throw new Error(`שגיאה בקריאת תשובת Google AI API: ${textError.message}`);
    }

    if (!response.ok) {
        console.error(`Google AI API Error: ${response.status} - ${responseText}`);
        
        // Try to parse error as JSON for better error details
        let errorDetails = responseText;
        try {
            const errorData = JSON.parse(responseText);
            errorDetails = errorData.error?.message || responseText;
        } catch (parseError) {
            // If we can't parse as JSON, use the raw text
            console.warn('Could not parse error response as JSON:', parseError);
        }
        
        throw new Error(`Google AI API שגיאה: ${response.status} - ${errorDetails}`);
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (jsonError) {
        console.error('Failed to parse response as JSON. Raw response:', responseText);
        throw new Error(`שגיאה בפיענוח תשובת Google AI API: התקבלה תשובה לא תקינה. ייתכן שהמפתח API לא תקין או שיש בעיית רשת.`);
    }
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text.trim();
    } else {
        throw new Error('תגובה לא תקינה מ-Google AI API');
    }
}

/**
 * ניקוי וחלקות סופיים של הטקסט המאורגן
 */
function cleanAndSmooth(text) {
    // הסרת שורות ריקות מיותרות
    let cleaned = text.replace(/\n{3,}/g, '\n\n');
    
    // תיקון כותרות כפולות
    cleaned = cleaned.replace(/^(#{1,6}\s+.+)\n\1/gm, '$1');
    
    // תיקון פסקאות שנקטעו
    cleaned = cleaned.replace(/([^.!?:])\n([א-ת])/g, '$1 $2');
    
    // וידוא שכותרות מתחילות בשורה חדשה
    cleaned = cleaned.replace(/([^.\n])\n(#{1,6}\s+)/g, '$1\n\n$2');
    
    return cleaned.trim();
}

module.exports = {
    performSmartSearch,
    performSimpleSearch,
    organizeText,
};

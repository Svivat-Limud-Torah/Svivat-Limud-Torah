// backend/searchLogicV2.js
const fs = require('fs').promises;
const path = require('path');
const fg = require('fast-glob'); // Using fast-glob for powerful pattern matching

// Sensible defaults for text-based file extensions (can be expanded)
const DEFAULT_TEXT_EXTENSIONS = [
    '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.less',
    '.xml', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log', '.sh', '.bash', '.py', '.rb', '.php',
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.swift', '.kt', '.kts', '.dart',
    '.vue', '.svelte', '.pl', '.pm', '.tcl', '.vb', '.vbs', '.csv', '.tsv', '.rtf', '.tex', '.text'
];

// Default patterns to exclude from search
const DEFAULT_EXCLUDE_PATTERNS = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.vscode/**',
    '.idea/**',
    '*.lock', // e.g., package-lock.json, yarn.lock
    '*.log',
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.bmp', '*.ico', '*.webp', '*.svg',
    '*.mp3', '*.wav', '*.ogg', '*.flac',
    '*.mp4', '*.mov', '*.avi', '*.mkv',
    '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt', '*.pptx',
    '*.zip', '*.tar', '*.gz', '*.rar', '*.7z',
    '*.exe', '*.dll', '*.so', '*.app', '*.dmg',
    '*.class', '*.jar',
    '*.pyc', '*.pyd',
    '*.o', '*.a',
    '*.DS_Store'
];

const STYLES_SUFFIX = '.styles.json'; // To avoid searching in our own style files

/**
 * Checks if a file is likely a binary file based on its extension or name.
 * @param {string} filePath Absolute path to the file.
 * @returns {boolean} True if the file is likely binary or a style file, false otherwise.
 */
function isLikelyBinaryOrStyleFile(filePath) {
    if (filePath.endsWith(STYLES_SUFFIX)) {
        return true;
    }
    const ext = path.extname(filePath).toLowerCase();
    if (!ext) return false; 
    return !DEFAULT_TEXT_EXTENSIONS.includes(ext);
}

/**
 * Escapes special regular expression characters in a string.
 * @param {string} string - The input string.
 * @returns {string} The string with special regex characters escaped.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Generates a highlighted preview of a line.
 * @param {string} lineText - The original line text.
 * @param {string} searchTerm - The term that was searched for (non-regex version for simple replacement).
 * @param {RegExp} searchRegExp - The actual RegExp used for matching.
 * @param {boolean} caseSensitive - Whether the search was case-sensitive.
 * @returns {{ preview: string, positions: Array<{start: number, end: number}> }}
 */
function generateMatchPreview(lineText, searchTerm, searchRegExp, caseSensitive) {
    let preview = lineText;
    const positions = [];
    let match;
    
    // Create a new RegExp for replacement to handle global and case flags correctly
    const replaceRegExp = new RegExp(searchRegExp.source, searchRegExp.flags.includes('g') ? searchRegExp.flags : searchRegExp.flags + 'g');

    // To avoid infinite loops with empty matches (e.g. `\b` at end of line), and to handle multiple matches
    // we iterate using exec and build the string manually.
    let resultText = "";
    let lastIndex = 0;
    
    while ((match = replaceRegExp.exec(lineText)) !== null) {
        resultText += lineText.substring(lastIndex, match.index);
        resultText += `@@MATCH_START@@${match[0]}@@MATCH_END@@`;
        positions.push({ start: match.index, end: match.index + match[0].length });
        lastIndex = match.index + match[0].length;
        if (replaceRegExp.lastIndex === match.index) { // Avoid infinite loops on zero-length matches
            replaceRegExp.lastIndex++;
        }
    }
    resultText += lineText.substring(lastIndex);
    
    return { preview: resultText, positions };
}


/**
 * Performs a search operation with advanced features.
 * @param {string} basePath - The absolute path.
 * @param {string} searchTerm - The string or regex pattern.
 * @param {object} options - {isRegex, caseSensitive, wholeWord}.
 * @param {string[]} [includePatterns] - Glob patterns to include.
 * @param {string[]} [excludePatterns] - Glob patterns to exclude.
 * @returns {Promise<Array<object>>} Array of match objects.
 */
async function performSearchV2(basePath, searchTerm, options, includePatterns, excludePatterns) {
    const finalResults = [];
    const CONTEXT_LINES = 2; // Number of context lines before and after

    const globOptions = {
        cwd: basePath,
        dot: true,
        ignore: excludePatterns && excludePatterns.length > 0 ? excludePatterns : DEFAULT_EXCLUDE_PATTERNS,
        onlyFiles: true,
        absolute: true,
        caseSensitiveMatch: false,
        followSymbolicLinks: false,
    };

    const patternsToGlob = includePatterns && includePatterns.length > 0 ? includePatterns : ['**/*'];
    
    let searchRegExp;
    try {
        if (options.isRegex) {
            searchRegExp = new RegExp(searchTerm, options.caseSensitive ? 'g' : 'gi');
        } else {
            let escapedTerm = escapeRegExp(searchTerm);
            if (options.wholeWord) {
                escapedTerm = `\\b${escapedTerm}\\b`;
            }
            searchRegExp = new RegExp(escapedTerm, options.caseSensitive ? 'g' : 'gi');
        }
    } catch (e) {
        // console.error("Invalid RegExp:", e.message);
        throw new Error(`Invalid regular expression: ${e.message}`);
    }

    try {
        const files = await fg(patternsToGlob, globOptions);

        for (const absoluteFilePath of files) {
            if (isLikelyBinaryOrStyleFile(absoluteFilePath)) {
                continue;
            }
            
            let fileContent;
            try {
                fileContent = await fs.readFile(absoluteFilePath, 'utf-8');
            } catch (readError) {
                // console.warn(`Skipping file ${absoluteFilePath} due to read error: ${readError.message}`);
                continue; 
            }

            const lines = fileContent.split(/\r\n|\r|\n/);
            const fileMatchesDetails = [];

            for (let i = 0; i < lines.length; i++) {
                const currentLineText = lines[i];
                const matchesOnLine = [];
                let match;
                
                // Reset lastIndex for each line
                searchRegExp.lastIndex = 0; 

                while ((match = searchRegExp.exec(currentLineText)) !== null) {
                    matchesOnLine.push({
                        index: match.index,
                        length: match[0].length,
                        text: match[0]
                    });
                     // Prevent infinite loops with zero-width matches
                    if (match.index === searchRegExp.lastIndex) {
                        searchRegExp.lastIndex++;
                    }
                }

                if (matchesOnLine.length > 0) {
                    const contextBefore = lines.slice(Math.max(0, i - CONTEXT_LINES), i);
                    const contextAfter = lines.slice(i + 1, Math.min(lines.length, i + 1 + CONTEXT_LINES));
                    
                    // Generate preview for the entire line, highlighting all matches
                    // For simplicity in generateMatchPreview, pass the original searchTerm if not regex,
                    // but the searchRegExp is the source of truth for matching.
                    const previewData = generateMatchPreview(currentLineText, searchTerm, searchRegExp, options.caseSensitive);

                    fileMatchesDetails.push({
                        lineNumber: i + 1,
                        lineText: currentLineText,
                        matchPreview: previewData.preview,
                        contextBefore: contextBefore,
                        contextAfter: contextAfter,
                        // charPositionInLine could be an array of {start, end} if multiple matches on a line
                        // For now, using the positions collected by generateMatchPreview.
                        charPositionsInLine: previewData.positions,
                    });
                }
            }

            if (fileMatchesDetails.length > 0) {
                finalResults.push({
                    filePath: path.relative(basePath, absoluteFilePath).replace(/\\/g, '/'),
                    fileName: path.basename(absoluteFilePath),
                    matches: fileMatchesDetails,
                });
            }
        }
    } catch (globError) {
        console.error(`Error during file globbing in ${basePath}:`, globError);
        throw new Error(`File globbing failed: ${globError.message}`);
    }

    return finalResults;
}

module.exports = {
    performSearchV2,
};
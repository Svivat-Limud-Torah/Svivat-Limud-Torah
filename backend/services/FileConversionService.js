// backend/services/FileConversionService.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const mammoth = require('mammoth'); // For .docx files

/**
 * Service for converting various file types to Markdown format
 */
class FileConversionService {
    constructor() {
        // Supported file extensions for conversion
        this.supportedExtensions = ['.txt', '.docx', '.pdf', '.md', '.html', '.rtf'];
    }

    /**
     * Convert a single file to Markdown
     * @param {string} filePath - Absolute path to the file
     * @returns {Promise<string>} - The converted content in Markdown format
     */
    async convertFileToMarkdown(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        switch (ext) {
            case '.txt':
                return await this.convertTxtToMarkdown(filePath);
            case '.docx':
                return await this.convertDocxToMarkdown(filePath);
            case '.pdf':
                return await this.convertPdfToMarkdown(filePath);
            case '.md':
                return await this.convertMdToMarkdown(filePath); // Just copy content
            case '.html':
                return await this.convertHtmlToMarkdown(filePath);
            case '.rtf':
                return await this.convertRtfToMarkdown(filePath);
            default:
                throw new Error(`סוג קובץ לא נתמך: ${ext}`);
        }
    }

    /**
     * Convert TXT file to Markdown
     */
    async convertTxtToMarkdown(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // For TXT files, just wrap content and preserve line breaks
            return content;
        } catch (error) {
            throw new Error(`שגיאה בקריאת קובץ TXT: ${error.message}`);
        }
    }

    /**
     * Convert DOCX file to Markdown
     */
    async convertDocxToMarkdown(filePath) {
        try {
            const result = await mammoth.convertToMarkdown({ path: filePath });
            return result.value;
        } catch (error) {
            throw new Error(`שגיאה בהמרת קובץ DOCX: ${error.message}`);
        }
    }

    /**
     * Convert PDF file to Markdown using Poppler's pdftotext (much better quality)
     */
    async convertPdfToMarkdown(filePath) {
        try {
            // Use pdftotext command directly (installed with Poppler)
            // Remove -layout flag for better Hebrew text extraction
            const quotedPath = `"${filePath}"`;
            const command = `pdftotext -enc UTF-8 -raw ${quotedPath} -`;
            
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr && !stdout) {
                throw new Error(`pdftotext error: ${stderr}`);
            }
            
            // Clean up the extracted text for Hebrew content
            let cleanText = stdout
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                // Remove line numbers at the beginning of lines (more comprehensive)
                .replace(/^\s*\d+\s+/gm, '')
                .replace(/^\s*\d+$/gm, '') // Lines with only numbers
                // Remove Hebrew text mixed with line numbers pattern
                .replace(/^\s*\d+\s*([\u0590-\u05FF\s]+)\s*$/gm, '$1')
                // Remove extra whitespace at the beginning and end of lines
                .replace(/^\s+/gm, '')
                .replace(/\s+$/gm, '')
                // Fix multiple spaces
                .replace(/[ \t]+/g, ' ')
                // Remove excessive line breaks but preserve paragraph structure
                .replace(/\n{3,}/g, '\n\n')
                // Clean up any remaining formatting artifacts
                .replace(/[\u200E\u200F\u202A-\u202E]/g, '') // Remove directional marks
                .trim();
            
            // Apply Hebrew-specific cleanup
            cleanText = this.cleanHebrewText(cleanText);
            
            // If the text still looks problematic, try alternative extraction
            if (cleanText.length < 50 || this.isTextGarbled(cleanText)) {
                console.log('Trying alternative PDF extraction method...');
                return await this.alternativePdfExtraction(filePath);
            }
            
            return cleanText;
        } catch (error) {
            console.error('PDF conversion error:', error);
            // Try alternative method if primary fails
            try {
                console.log('Trying alternative PDF extraction method due to error...');
                return await this.alternativePdfExtraction(filePath);
            } catch (altError) {
                throw new Error(`שגיאה בהמרת קובץ PDF: ${error.message}`);
            }
        }
    }
    
    /**
     * Alternative PDF extraction method without layout preservation
     */
    async alternativePdfExtraction(filePath) {
        try {
            const quotedPath = `"${filePath}"`;
            // Try with different pdftotext options for better Hebrew handling
            const command = `pdftotext -enc UTF-8 -nopgbrk ${quotedPath} -`;
            
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr && !stdout) {
                throw new Error(`Alternative pdftotext error: ${stderr}`);
            }
            
            // More aggressive cleaning for Hebrew text
            let cleanText = stdout
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                // Remove any remaining line numbers or page artifacts
                .replace(/^\s*\d+\s*/gm, '')
                .replace(/^\s*Page\s+\d+.*$/gim, '')
                // Remove header/footer patterns that might include page numbers
                .replace(/^\s*\d+\s*$/gm, '') // Lines with only numbers
                .replace(/^\s*[\u0590-\u05FF\s]*\d+[\u0590-\u05FF\s]*$/gm, '') // Hebrew text with numbers
                // Clean whitespace
                .replace(/^\s+/gm, '')
                .replace(/\s+$/gm, '')
                .replace(/[ \t]+/g, ' ')
                // Fix Hebrew text flow issues
                .replace(/(\u0590-\u05FF)\s+(\d+)\s+(\u0590-\u05FF)/g, '$1 $3') // Remove numbers between Hebrew words
                // Normalize line breaks
                .replace(/\n{3,}/g, '\n\n')
                // Remove directional control characters
                .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
                .trim();
            
            // Additional Hebrew-specific cleanup
            cleanText = this.cleanHebrewText(cleanText);
            
            return cleanText;
        } catch (error) {
            throw new Error(`Alternative PDF extraction failed: ${error.message}`);
        }
    }
    
    /**
     * Clean Hebrew text from common PDF extraction artifacts
     */
    cleanHebrewText(text) {
        return text
            // Remove isolated numbers that might be line numbers
            .replace(/^\s*\d+\s*$/gm, '')
            // Remove lines that are mostly numbers with little text
            .replace(/^[^\u0590-\u05FF]*\d+[^\u0590-\u05FF]*$/gm, '')
            // Fix spacing around Hebrew punctuation
            .replace(/\s+([,.:;!?])/g, '$1')
            .replace(/([,.:;!?])\s+/g, '$1 ')
            // Remove excessive spaces in Hebrew text
            .replace(/(\u0590-\u05FF)\s{2,}(\u0590-\u05FF)/g, '$1 $2')
            // Clean up broken Hebrew words (letters separated by spaces)
            .replace(/(\u0590-\u05FF)\s+(\u0590-\u05FF)(?=\s|$)/g, '$1$2')
            // Remove empty lines that contain only whitespace or control characters
            .replace(/^\s*[\u200E\u200F\u202A-\u202E\s]*$/gm, '')
            // Normalize multiple spaces
            .replace(/\s{2,}/g, ' ')
            // Clean line starts and ends
            .replace(/^\s+/gm, '')
            .replace(/\s+$/gm, '');
    }
    
    /**
     * Check if extracted text appears garbled or problematic
     */
    isTextGarbled(text) {
        // Check for signs of garbled text
        const lines = text.split('\n');
        let suspiciousLines = 0;
        
        for (const line of lines.slice(0, 10)) { // Check first 10 lines
            // Check for too many numbers (might be line numbers mixed with text)
            const numberRatio = (line.match(/\d/g) || []).length / Math.max(line.length, 1);
            if (numberRatio > 0.3) suspiciousLines++;
            
            // Check for very short lines that might be artifacts
            if (line.trim().length > 0 && line.trim().length < 3) suspiciousLines++;
        }
        
        return suspiciousLines > 5;
    }

    /**
     * Convert MD file (just copy content)
     */
    async convertMdToMarkdown(filePath) {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            throw new Error(`שגיאה בקריאת קובץ Markdown: ${error.message}`);
        }
    }

    /**
     * Convert HTML file to Markdown (basic conversion)
     */
    async convertHtmlToMarkdown(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Basic HTML to Markdown conversion
            let markdown = content
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
                .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
                .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
                .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
                .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1\n')
                .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
                .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            return markdown;
        } catch (error) {
            throw new Error(`שגיאה בהמרת קובץ HTML: ${error.message}`);
        }
    }

    /**
     * Convert RTF file to Markdown (basic conversion)
     */
    async convertRtfToMarkdown(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Very basic RTF to text conversion
            // This is simplified and might not work for complex RTF files
            const text = content
                .replace(/\\[a-z]+\d*\s?/gi, '') // Remove RTF control words
                .replace(/[{}]/g, '') // Remove braces
                .replace(/\\\\/g, '\\') // Fix escaped backslashes
                .replace(/\\n/g, '\n') // Convert newlines
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
            
            return text;
        } catch (error) {
            throw new Error(`שגיאה בהמרת קובץ RTF: ${error.message}`);
        }
    }

    /**
     * Scan directory for convertible files
     * @param {string} dirPath - Directory to scan
     * @returns {Promise<Array>} - Array of file info objects
     */
    async scanDirectoryForConvertibleFiles(dirPath) {
        const files = [];
        
        try {
            await this.scanDirectoryRecursive(dirPath, dirPath, files);
            return files;
        } catch (error) {
            throw new Error(`שגיאה בסריקת התיקייה: ${error.message}`);
        }
    }

    /**
     * Scan directory for all files (both convertible and non-convertible)
     * @param {string} dirPath - Directory to scan
     * @returns {Promise<Object>} - Object with convertible and non-convertible files
     */
    async scanDirectoryForAllFiles(dirPath) {
        const convertibleFiles = [];
        const nonConvertibleFiles = [];
        
        try {
            await this.scanDirectoryRecursiveForAll(dirPath, dirPath, convertibleFiles, nonConvertibleFiles);
            return {
                convertibleFiles,
                nonConvertibleFiles
            };
        } catch (error) {
            throw new Error(`שגיאה בסריקת התיקייה: ${error.message}`);
        }
    }

    /**
     * Recursive directory scanning
     */
    async scanDirectoryRecursive(currentPath, basePath, files) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                const relativePath = path.relative(basePath, fullPath);
                
                if (entry.isDirectory()) {
                    await this.scanDirectoryRecursive(fullPath, basePath, files);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (this.supportedExtensions.includes(ext)) {
                        files.push({
                            name: entry.name,
                            relativePath: relativePath.replace(/\\/g, '/'),
                            absolutePath: fullPath,
                            extension: ext,
                            isDirectory: false
                        });
                    }
                }
            }
        } catch (error) {
            console.warn(`שגיאה בסריקת תיקייה ${currentPath}: ${error.message}`);
        }
    }

    /**
     * Recursive directory scanning for all files
     */
    async scanDirectoryRecursiveForAll(currentPath, basePath, convertibleFiles, nonConvertibleFiles) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                const relativePath = path.relative(basePath, fullPath);
                
                if (entry.isDirectory()) {
                    await this.scanDirectoryRecursiveForAll(fullPath, basePath, convertibleFiles, nonConvertibleFiles);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    const fileInfo = {
                        name: entry.name,
                        relativePath: relativePath.replace(/\\/g, '/'),
                        absolutePath: fullPath,
                        extension: ext,
                        isDirectory: false
                    };
                    
                    if (this.supportedExtensions.includes(ext)) {
                        convertibleFiles.push(fileInfo);
                    } else {
                        nonConvertibleFiles.push(fileInfo);
                    }
                }
            }
        } catch (error) {
            console.warn(`שגיאה בסריקת תיקייה ${currentPath}: ${error.message}`);
        }
    }

    /**
     * Convert multiple files and create new directory structure
     * @param {string} sourceDir - Source directory path
     * @param {string} targetDir - Target directory path (will be created)
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Object>} - Conversion results
     */
    async convertDirectoryToMarkdown(sourceDir, targetDir, progressCallback = null) {
        const results = {
            successful: [],
            failed: [],
            copied: [],
            totalFiles: 0,
            convertedFiles: 0,
            copiedFiles: 0
        };

        try {
            // Create target directory if it doesn't exist
            if (!fsSync.existsSync(targetDir)) {
                await fs.mkdir(targetDir, { recursive: true });
            }

            // Scan for all files (both convertible and non-convertible)
            const { convertibleFiles, nonConvertibleFiles } = await this.scanDirectoryForAllFiles(sourceDir);
            results.totalFiles = convertibleFiles.length + nonConvertibleFiles.length;

            if (progressCallback) {
                progressCallback({ 
                    type: 'start', 
                    totalFiles: results.totalFiles,
                    convertibleFiles: convertibleFiles.length,
                    nonConvertibleFiles: nonConvertibleFiles.length
                });
            }

            // Convert each convertible file
            for (const file of convertibleFiles) {
                try {
                    // Convert content
                    const markdownContent = await this.convertFileToMarkdown(file.absolutePath);
                    
                    // Create target file path with .md extension
                    const targetFilePath = path.join(
                        targetDir, 
                        this.changeExtensionToMd(file.relativePath)
                    );
                    
                    // Create target directory structure
                    const targetFileDir = path.dirname(targetFilePath);
                    if (!fsSync.existsSync(targetFileDir)) {
                        await fs.mkdir(targetFileDir, { recursive: true });
                    }
                    
                    // Write converted content
                    await fs.writeFile(targetFilePath, markdownContent, 'utf-8');
                    
                    results.successful.push({
                        originalPath: file.relativePath,
                        convertedPath: this.changeExtensionToMd(file.relativePath),
                        originalExtension: file.extension
                    });
                    
                    results.convertedFiles++;
                    
                    if (progressCallback) {
                        progressCallback({
                            type: 'progress',
                            currentFile: results.convertedFiles + results.copiedFiles,
                            totalFiles: results.totalFiles,
                            fileName: file.name,
                            action: 'converted'
                        });
                    }
                    
                } catch (error) {
                    results.failed.push({
                        path: file.relativePath,
                        error: error.message,
                        type: 'conversion'
                    });
                    
                    console.error(`שגיאה בהמרת קובץ ${file.relativePath}: ${error.message}`);
                }
            }

            // Copy each non-convertible file
            for (const file of nonConvertibleFiles) {
                try {
                    // Create target file path (same relative path and extension)
                    const targetFilePath = path.join(targetDir, file.relativePath);
                    
                    // Create target directory structure
                    const targetFileDir = path.dirname(targetFilePath);
                    if (!fsSync.existsSync(targetFileDir)) {
                        await fs.mkdir(targetFileDir, { recursive: true });
                    }
                    
                    // Copy the file
                    await fs.copyFile(file.absolutePath, targetFilePath);
                    
                    results.copied.push({
                        originalPath: file.relativePath,
                        copiedPath: file.relativePath,
                        extension: file.extension
                    });
                    
                    results.copiedFiles++;
                    
                    if (progressCallback) {
                        progressCallback({
                            type: 'progress',
                            currentFile: results.convertedFiles + results.copiedFiles,
                            totalFiles: results.totalFiles,
                            fileName: file.name,
                            action: 'copied'
                        });
                    }
                    
                } catch (error) {
                    results.failed.push({
                        path: file.relativePath,
                        error: error.message,
                        type: 'copy'
                    });
                    
                    console.error(`שגיאה בהעתקת קובץ ${file.relativePath}: ${error.message}`);
                }
            }

            if (progressCallback) {
                progressCallback({ type: 'complete', results });
            }

            return results;
            
        } catch (error) {
            throw new Error(`שגיאה בהמרת התיקייה: ${error.message}`);
        }
    }

    /**
     * Change file extension to .md
     */
    changeExtensionToMd(filePath) {
        const ext = path.extname(filePath);
        return filePath.slice(0, -ext.length) + '.md';
    }

    /**
     * Change file extension to specified format
     */
    changeExtensionTo(filePath, newExtension) {
        const ext = path.extname(filePath);
        return filePath.slice(0, -ext.length) + '.' + newExtension;
    }

    /**
     * Convert Markdown content to HTML
     */
    convertMarkdownToHtml(markdownContent) {
        // Basic Markdown to HTML conversion
        let html = markdownContent
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // Wrap in paragraphs
        html = '<p>' + html + '</p>';
        
        // Fix empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        
        return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מסמך מומר</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 2em;
            margin-bottom: 1em;
        }
        p {
            margin-bottom: 1em;
        }
        strong {
            font-weight: bold;
        }
        em {
            font-style: italic;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
    }

    /**
     * Convert Markdown content to plain text
     */
    convertMarkdownToText(markdownContent) {
        // Remove Markdown formatting to create plain text
        return markdownContent
            .replace(/^#{1,6}\s+/gm, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
            .replace(/`([^`]+)`/g, '$1') // Remove inline code
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/^\s*[-+*]\s+/gm, '') // Remove list markers
            .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
            .replace(/^\s*>\s+/gm, '') // Remove blockquotes
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
            .trim();
    }

    /**
     * Convert file to specified format
     * @param {string} filePath - Absolute path to the file
     * @param {string} targetFormat - Target format ('md', 'html', 'txt')
     * @returns {Promise<string>} - The converted content
     */
    async convertFileToFormat(filePath, targetFormat = 'md') {
        // First convert to markdown (our intermediate format)
        const markdownContent = await this.convertFileToMarkdown(filePath);
        
        switch (targetFormat.toLowerCase()) {
            case 'md':
                return markdownContent;
            case 'html':
                return this.convertMarkdownToHtml(markdownContent);
            case 'txt':
                return this.convertMarkdownToText(markdownContent);
            default:
                throw new Error(`פורמט יעד לא נתמך: ${targetFormat}`);
        }
    }

    /**
     * Check if file type is supported for conversion
     */
    isFileSupported(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    /**
     * Get supported file extensions for conversion
     */
    getSupportedExtensions() {
        return this.supportedExtensions;
    }
}

module.exports = new FileConversionService();

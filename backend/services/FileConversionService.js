// backend/services/FileConversionService.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const mammoth = require('mammoth'); // For .docx files
const pdfParse = require('pdf-parse'); // For .pdf files

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
     * Convert PDF file to Markdown
     */
    async convertPdfToMarkdown(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const pdfData = await pdfParse(dataBuffer);
            // Clean up the text and format as markdown
            const cleanText = pdfData.text
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            return cleanText;
        } catch (error) {
            throw new Error(`שגיאה בהמרת קובץ PDF: ${error.message}`);
        }
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
            totalFiles: 0,
            convertedFiles: 0
        };

        try {
            // Create target directory if it doesn't exist
            if (!fsSync.existsSync(targetDir)) {
                await fs.mkdir(targetDir, { recursive: true });
            }

            // Scan for convertible files
            const files = await this.scanDirectoryForConvertibleFiles(sourceDir);
            results.totalFiles = files.length;

            if (progressCallback) {
                progressCallback({ type: 'start', totalFiles: files.length });
            }

            // Convert each file
            for (const file of files) {
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
                            currentFile: results.convertedFiles,
                            totalFiles: results.totalFiles,
                            fileName: file.name
                        });
                    }
                    
                } catch (error) {
                    results.failed.push({
                        path: file.relativePath,
                        error: error.message
                    });
                    
                    console.error(`שגיאה בהמרת קובץ ${file.relativePath}: ${error.message}`);
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
     * Check if file type is supported for conversion
     */
    isFileSupported(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }
}

module.exports = new FileConversionService();

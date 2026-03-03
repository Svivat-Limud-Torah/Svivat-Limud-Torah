// frontend/src/services/FileConversionWebService.js
// Client-side file conversion (no backend needed).
// Converts DOCX, PDF, HTML, RTF, TXT → Markdown/HTML/TXT entirely in the browser.

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ─── Core Conversions → Markdown ──────────────────────────────────────────────

async function convertDocxToMarkdown(arrayBuffer) {
  const result = await mammoth.convertToMarkdown({ arrayBuffer });
  return result.value;
}

async function convertPdfToMarkdown(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push(text);
  }
  let raw = pages.join('\n\n');
  // Hebrew cleanup (ported from backend)
  raw = raw
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/^\s*\d+\s+/gm, '')
    .replace(/^\s*\d+$/gm, '')
    .replace(/^\s+/gm, '').replace(/\s+$/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .trim();
  return raw;
}

function convertHtmlToMarkdown(text) {
  return text
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
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function convertRtfToMarkdown(text) {
  return text
    .replace(/\\[a-z]+\d*\s?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Output format conversions ───────────────────────────────────────────────

function convertMarkdownToHtml(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

function convertMarkdownToText(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert file content to the target format.
 * @param {string} fileName - e.g. "document.docx"
 * @param {string|ArrayBuffer} fileContent - text string or ArrayBuffer (for binary formats)
 * @param {string} sourceFormat - extension without dot, e.g. "docx"
 * @param {string} targetFormat - "md" | "txt" | "html"
 * @returns {Promise<{convertedContent: string, outputFileName: string}>}
 */
export async function convertFileContent(fileName, fileContent, sourceFormat, targetFormat = 'md') {
  const src = sourceFormat.toLowerCase().replace('.', '');

  // Step 1: Convert to Markdown (intermediate)
  let markdown;
  switch (src) {
    case 'docx':
    case 'doc': {
      // Need ArrayBuffer
      const buf = fileContent instanceof ArrayBuffer ? fileContent
        : typeof fileContent === 'string' && fileContent.length > 0
          ? base64ToArrayBuffer(fileContent)
          : new TextEncoder().encode(fileContent).buffer;
      markdown = await convertDocxToMarkdown(buf);
      break;
    }
    case 'pdf': {
      const buf = fileContent instanceof ArrayBuffer ? fileContent
        : typeof fileContent === 'string' && fileContent.length > 0
          ? base64ToArrayBuffer(fileContent)
          : new TextEncoder().encode(fileContent).buffer;
      markdown = await convertPdfToMarkdown(buf);
      break;
    }
    case 'html':
    case 'htm':
      markdown = convertHtmlToMarkdown(typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent));
      break;
    case 'rtf':
      markdown = convertRtfToMarkdown(typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent));
      break;
    case 'txt':
    case 'md':
      markdown = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent);
      break;
    default:
      throw new Error(`סוג קובץ לא נתמך להמרה: .${src}`);
  }

  // Step 2: Convert Markdown → target format
  let convertedContent;
  switch (targetFormat) {
    case 'md':
      convertedContent = markdown;
      break;
    case 'html':
      convertedContent = convertMarkdownToHtml(markdown);
      break;
    case 'txt':
      convertedContent = convertMarkdownToText(markdown);
      break;
    default:
      convertedContent = markdown;
  }

  const outputFileName = fileName.replace(/\.[^/.]+$/, `.${targetFormat}`);
  return { convertedContent, outputFileName };
}

/**
 * Convert a batch of File objects (from directory picker or drag-drop).
 * @param {File[]} files
 * @param {string} targetFormat - "md" | "txt" | "html"
 * @returns {Promise<{converted: Array, failed: Array, skipped: number}>}
 */
export async function convertFiles(files, targetFormat = 'md') {
  const SUPPORTED = new Set(['txt', 'docx', 'doc', 'pdf', 'html', 'htm', 'rtf', 'md']);
  const converted = [];
  const failed = [];
  let skipped = 0;

  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED.has(ext)) { skipped++; continue; }
    try {
      const content = ['docx', 'doc', 'pdf'].includes(ext)
        ? await file.arrayBuffer()
        : await file.text();
      const result = await convertFileContent(file.name, content, ext, targetFormat);
      converted.push({ ...result, originalName: file.name, relativePath: file.webkitRelativePath || file.name });
    } catch (err) {
      failed.push({ name: file.name, error: err.message });
    }
  }
  return { converted, failed, skipped };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default { convertFileContent, convertFiles };

// functions/fileConversion.js
// File conversion utilities for Firebase Functions

const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fetch = require('node-fetch');

/**
 * Convert a file to text based on file type
 */
async function convertFile(fileUrl, fileType) {
  try {
    // Download file from URL
    const response = await fetch(fileUrl);
    const buffer = await response.buffer();

    let text = '';

    switch (fileType.toLowerCase()) {
      case 'docx':
        text = await convertDocx(buffer);
        break;
      case 'pdf':
        text = await convertPdf(buffer);
        break;
      case 'txt':
        text = buffer.toString('utf-8');
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    return {
      success: true,
      text,
      fileType
    };
  } catch (error) {
    console.error('File conversion error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert DOCX to text
 */
async function convertDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Convert PDF to text
 */
async function convertPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

module.exports = {
  convertFile
};

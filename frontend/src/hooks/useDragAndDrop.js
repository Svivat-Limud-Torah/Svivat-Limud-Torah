// frontend/src/hooks/useDragAndDrop.js
import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../utils/constants';

// File type classification
const TEXT_EXTENSIONS = new Set([
  'md', 'txt', 'html', 'htm', 'js', 'ts', 'jsx', 'tsx', 'json', 'css', 'scss',
  'less', 'yaml', 'yml', 'xml', 'csv', 'log', 'py', 'sh', 'bat', 'java', 'php',
  'rb', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs', 'swift', 'kt', 'sql', 'env',
  'ini', 'cfg', 'conf', 'toml', 'lock', 'gitignore', 'prettierrc', 'eslintrc',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp', 'ico']);
const PDF_EXTENSIONS = new Set(['pdf']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'avi', 'mov', 'mkv']);
const CONVERTIBLE_EXTENSIONS = new Set(['docx', 'doc', 'rtf', 'odt', 'pptx', 'xlsx']);

function getFileExtension(fileName) {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function classifyFile(fileName) {
  const ext = getFileExtension(fileName);
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (CONVERTIBLE_EXTENSIONS.has(ext)) return 'convertible';
  return 'unknown';
}

/**
 * Hook that enables drag & drop of external files onto the entire app.
 * @param {function} onOpenTextTab - called with (fileName, content)
 * @param {function} onOpenBinaryTab - called with (fileName, type, objectUrl)
 * @param {function} onConversionResult - called with (fileName, markdownContent) after backend conversion
 * @param {function} setGlobalLoadingMessage
 */
export default function useDragAndDrop({
  onOpenTextTab,
  onOpenBinaryTab,
  onConversionResult,
  setGlobalLoadingMessage,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState('');
  // Counter to track nested dragenter/dragleave (child elements fire their own events)
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    setDragError('');

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      const fileType = classifyFile(file.name);

      try {
        if (fileType === 'text') {
          const content = await file.text();
          onOpenTextTab(file.name, content);

        } else if (fileType === 'image' || fileType === 'audio' || fileType === 'video' || fileType === 'pdf') {
          const objectUrl = URL.createObjectURL(file);
          onOpenBinaryTab(file.name, fileType, objectUrl);

        } else if (fileType === 'convertible') {
          setGlobalLoadingMessage(`ממיר את ${file.name}...`);
          try {
            const ext = getFileExtension(file.name);
            // Read as base64 for binary conversion
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
            }
            const base64Content = btoa(binary);

            const response = await fetch(`${API_BASE_URL}/file-conversion/convert-file-content`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                fileContent: base64Content,
                sourceFormat: ext,
                targetFormat: 'md',
                encoding: 'base64',
              }),
            });

            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.error || 'שגיאה בהמרה');
            }

            const result = await response.json();
            const newName = file.name.replace(/\.[^/.]+$/, '.md');
            onConversionResult(newName, result.convertedContent);
          } finally {
            setGlobalLoadingMessage('');
          }

        } else {
          // Unknown type — try as text, fall back gracefully
          try {
            const content = await file.text();
            onOpenTextTab(file.name, content);
          } catch {
            setDragError(`לא ניתן לפתוח את הקובץ "${file.name}" - סוג קובץ לא נתמך`);
          }
        }
      } catch (err) {
        console.error('Drag & drop error for', file.name, err);
        setGlobalLoadingMessage('');
        setDragError(`שגיאה בפתיחת "${file.name}": ${err.message}`);
      }
    }
  }, [onOpenTextTab, onOpenBinaryTab, onConversionResult, setGlobalLoadingMessage]);

  return {
    isDragOver,
    dragError,
    setDragError,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

// frontend/src/hooks/useDrawings.js
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'torah-ide-drawings-';

function loadDrawings(fileId) {
  if (!fileId) return [];
  try {
    const key = STORAGE_KEY_PREFIX + btoa(unescape(encodeURIComponent(fileId)));
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrawings(fileId, strokes) {
  if (!fileId) return;
  try {
    const key = STORAGE_KEY_PREFIX + btoa(unescape(encodeURIComponent(fileId)));
    localStorage.setItem(key, JSON.stringify(strokes));
  } catch (e) {
    console.error('Failed to save drawings:', e);
  }
}

export default function useDrawings() {
  const [currentFileId, setCurrentFileId] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [activeTool, setActiveTool] = useState(null); // null = drawing disabled
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);

  // Load when file changes
  useEffect(() => {
    setStrokes(currentFileId ? loadDrawings(currentFileId) : []);
  }, [currentFileId]);

  // Auto-save on every change
  useEffect(() => {
    if (currentFileId) saveDrawings(currentFileId, strokes);
  }, [strokes, currentFileId]);

  const addStroke = useCallback((stroke) => {
    setStrokes(prev => [...prev, stroke]);
  }, []);

  const undoLast = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    setStrokes([]);
  }, []);

  return {
    currentFileId,
    setCurrentFileId,
    strokes,
    addStroke,
    undoLast,
    clearAll,
    activeTool,
    setActiveTool,
    color,
    setColor,
    lineWidth,
    setLineWidth,
    isDrawMode: activeTool !== null,
  };
}

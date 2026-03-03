// frontend/src/hooks/useAnnotations.js
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'torah-ide-annotations-';

const ANNOTATION_COLORS = [
  { id: 'yellow', label: 'צהוב', bg: 'rgba(250, 204, 21, 0.35)', border: '#facc15' },
  { id: 'green',  label: 'ירוק', bg: 'rgba(74, 222, 128, 0.30)', border: '#4ade80' },
  { id: 'blue',   label: 'כחול', bg: 'rgba(96, 165, 250, 0.30)', border: '#60a5fa' },
  { id: 'pink',   label: 'ורוד', bg: 'rgba(244, 114, 182, 0.30)', border: '#f472b6' },
  { id: 'orange', label: 'כתום', bg: 'rgba(251, 146, 60, 0.30)', border: '#fb923c' },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadAnnotations(fileId) {
  if (!fileId) return [];
  try {
    const key = STORAGE_KEY_PREFIX + btoa(unescape(encodeURIComponent(fileId)));
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAnnotations(fileId, annotations) {
  if (!fileId) return;
  try {
    const key = STORAGE_KEY_PREFIX + btoa(unescape(encodeURIComponent(fileId)));
    localStorage.setItem(key, JSON.stringify(annotations));
  } catch (e) {
    console.error('Failed to save annotations:', e);
  }
}

export { ANNOTATION_COLORS };

export default function useAnnotations() {
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

  // Load annotations when file changes
  useEffect(() => {
    if (currentFileId) {
      setAnnotations(loadAnnotations(currentFileId));
    } else {
      setAnnotations([]);
    }
    setSelectedAnnotationId(null);
  }, [currentFileId]);

  // Persist on every change
  useEffect(() => {
    if (currentFileId) {
      saveAnnotations(currentFileId, annotations);
    }
  }, [annotations, currentFileId]);

  const addAnnotation = useCallback(({ selectedText, from, to, lineNumber, color = 'yellow', noteText = '' }) => {
    const annotation = {
      id: generateId(),
      selectedText,
      from,
      to,
      lineNumber,
      color,
      noteText,
      createdAt: Date.now(),
    };
    setAnnotations(prev => [...prev, annotation]);
    return annotation.id;
  }, []);

  const updateAnnotation = useCallback((id, updates) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAnnotation = useCallback((id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    setSelectedAnnotationId(prev => prev === id ? null : prev);
  }, []);

  const toggleAnnotationMode = useCallback(() => {
    setIsAnnotationMode(prev => !prev);
  }, []);

  return {
    isAnnotationMode,
    toggleAnnotationMode,
    setIsAnnotationMode,
    annotations,
    selectedAnnotationId,
    setSelectedAnnotationId,
    currentFileId,
    setCurrentFileId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    ANNOTATION_COLORS,
  };
}

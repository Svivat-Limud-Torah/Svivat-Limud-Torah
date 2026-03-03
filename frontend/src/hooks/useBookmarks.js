// frontend/src/hooks/useBookmarks.js
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'torah-ide-bookmarks';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistBookmarks(bookmarks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export default function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Persist whenever bookmarks change
  useEffect(() => {
    persistBookmarks(bookmarks);
  }, [bookmarks]);

  const addBookmark = useCallback(({ text, sourceFileId, sourceFileName, label = '' }) => {
    const bookmark = {
      id: generateId(),
      text,
      sourceFileId,
      sourceFileName,
      label,
      createdAt: Date.now(),
      pinned: false,
    };
    setBookmarks(prev => [bookmark, ...prev]);
    return bookmark.id;
  }, []);

  const deleteBookmark = useCallback((id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const updateBookmark = useCallback((id, updates) => {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const togglePin = useCallback((id) => {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, pinned: !b.pinned } : b));
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  return {
    bookmarks,
    isPanelOpen,
    setIsPanelOpen,
    togglePanel,
    addBookmark,
    deleteBookmark,
    updateBookmark,
    togglePin,
  };
}

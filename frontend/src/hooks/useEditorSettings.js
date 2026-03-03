// frontend/src/hooks/useEditorSettings.js
import { useState, useCallback } from 'react';

export default function useEditorSettings({
  activeTabObject, // From App, derived from useTabs.openTabs and App.activeTabPath
  editorSharedRef, // From App
  setOpenTabs,     // From useTabs, passed through App
}) {
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [highlightActiveLine, setHighlightActiveLine] = useState(true);
  const [scrollToLine, setScrollToLine] = useState(null);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleShowLineNumbers = () => setShowLineNumbers(prev => !prev);
  const toggleHighlightActiveLine = () => setHighlightActiveLine(prev => !prev);

  const toggleAutoSaveEnabled = () => {
    setAutoSaveEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('autoSaveEnabled', newValue.toString());
      return newValue;
    });
  };

  return {
    showLineNumbers,
    setShowLineNumbers,
    highlightActiveLine,
    setHighlightActiveLine,
    scrollToLine,
    setScrollToLine,
    autoSaveEnabled,
    setAutoSaveEnabled,
    toggleShowLineNumbers,
    toggleHighlightActiveLine,
    toggleAutoSaveEnabled,
  };
}

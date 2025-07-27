// frontend/src/hooks/useEditorSettings.js
import { useState, useCallback } from 'react';

export default function useEditorSettings({
  activeTabObject, // From App, derived from useTabs.openTabs and App.activeTabPath
  editorSharedRef, // From App
  setOpenTabs,     // From useTabs, passed through App
}) {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [highlightActiveLine, setHighlightActiveLine] = useState(true);
  const [scrollToLine, setScrollToLine] = useState(null);

  const toggleShowLineNumbers = () => setShowLineNumbers(prev => !prev);
  const toggleHighlightActiveLine = () => setHighlightActiveLine(prev => !prev);

  return {
    showLineNumbers,
    setShowLineNumbers,
    highlightActiveLine,
    setHighlightActiveLine,
    scrollToLine,
    setScrollToLine,
    toggleShowLineNumbers,
    toggleHighlightActiveLine,
  };
}

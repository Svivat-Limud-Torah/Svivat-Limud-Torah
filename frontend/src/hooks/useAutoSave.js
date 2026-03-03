// frontend/src/hooks/useAutoSave.js
import { useState, useEffect, useRef } from 'react';

const AUTO_SAVE_DELAY_MS = 2000;

/**
 * Debounced auto-save: fires handleSaveFile() 2 seconds after the last content change,
 * but only for dirty, non-new, text files.
 */
export default function useAutoSave({ activeTabObject, handleSaveFile, autoSaveEnabled = true }) {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const timerRef = useRef(null);
  const handleSaveFileRef = useRef(handleSaveFile);

  useEffect(() => {
    handleSaveFileRef.current = handleSaveFile;
  }, [handleSaveFile]);

  useEffect(() => {
    // Only auto-save text files that are dirty and already persisted (not brand-new unsaved files)
    const shouldAutoSave =
      autoSaveEnabled &&
      activeTabObject &&
      activeTabObject.type === 'file' &&
      activeTabObject.isDirty &&
      !activeTabObject.isNewUnsaved;

    if (!shouldAutoSave) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Reset any pending timer on each content change
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      setIsAutoSaving(true);
      try {
        await handleSaveFileRef.current();
      } finally {
        setIsAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabObject?.content, activeTabObject?.isDirty, activeTabObject?.id]);

  return { isAutoSaving };
}

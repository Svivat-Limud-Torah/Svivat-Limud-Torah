// frontend/src/components/TranscriptionResultView.jsx
import React from 'react';
import './TranscriptionResultView.css';
import { HEBREW_TEXT } from '../utils/constants';

export default function TranscriptionResultView({ 
    processedText, 
    isLoading, // This specific isLoading is for when the view itself is in a loading state (e.g. initial load, not API call)
    error, 
    onSave, 
    onDiscard, 
    processingMode 
}) {
  
  // This view is generally shown *after* an API call, 
  // so isLoading from parent (isProcessingText) dictates the spinner in the modal.
  // This isLoading prop is for cases where this component itself might have an async operation.
  if (isLoading) { 
    return <div className="loading-view result-loading">{HEBREW_TEXT.loading}...</div>;
  }
  
  const resultTitle = processingMode === 'organize' ? HEBREW_TEXT.organizedTextResult : HEBREW_TEXT.summarizedTextResult;
  const saveButtonText = processingMode === 'organize' ? HEBREW_TEXT.saveOrganizedText : HEBREW_TEXT.saveSummarizedText;

  return (
    <div className="transcription-result-view">
      <h3 className="result-title">{resultTitle}</h3>
      {error && <div className="error-view result-error">{HEBREW_TEXT.error}: {error}</div>}
      {processedText && !error && (
        <pre className="processed-text-content">{processedText}</pre>
      )}
      <div className="result-actions">
        {processedText && !error && (
          <button onClick={onSave} className="action-button save-result-button">
            {saveButtonText}
          </button>
        )}
        <button onClick={onDiscard} className="action-button discard-result-button">
          {error ? HEBREW_TEXT.tryAgain : HEBREW_TEXT.discard}
        </button>
      </div>
    </div>
  );
}
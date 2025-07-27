// frontend/src/components/SourceResultsDisplay.jsx
import React from 'react';
import './SourceResultsDisplay.css';
import { HEBREW_TEXT, APP_DIRECTION } from '../utils/constants';

const SourceResultsDisplay = ({
  resultsText,
  isLoading,
  error,
  onSave,
  onDiscard,
  onRedo,
  onCloseEditor, // To return to the main editor view
}) => {
  const handleSave = () => {
    if (resultsText && !isLoading) {
      onSave(resultsText);
    }
  };

  return (
    <div className="source-results-container" style={{ direction: APP_DIRECTION }}>
      <div className="source-results-header">
        <h2>{HEBREW_TEXT.sourceResultsTitle}</h2>
        <button onClick={onCloseEditor} className="source-results-close-editor-button" title={HEBREW_TEXT.returnToEditor}>
          × {HEBREW_TEXT.returnToEditor}
        </button>
      </div>

      {isLoading && (
        <div className="source-results-message">{HEBREW_TEXT.findingSources}</div>
      )}

      {error && !isLoading && (
        <div className="source-results-error">
          <p>{HEBREW_TEXT.sourceResultsError}: {error}</p>
          <button onClick={onRedo} className="source-results-button retry-button">
            {HEBREW_TEXT.redoSearch}
          </button>
        </div>
      )}

      {!isLoading && !error && resultsText && (
        <div className="source-results-content-area">
          <h3>{HEBREW_TEXT.sourceResultsContentHeader}</h3>
          <pre className="source-results-text-preview">{resultsText}</pre>
        </div>
      )}
      
      {!isLoading && !error && !resultsText && (
         <div className="source-results-message">{HEBREW_TEXT.noSourceFoundError /* Or a more generic "no results" */}</div>
      )}


      {!isLoading && (
        <div className="source-results-actions">
          <button
            onClick={handleSave}
            disabled={!resultsText || !!error}
            className="source-results-button save-button"
          >
            {HEBREW_TEXT.save}
          </button>
          <button
            onClick={onRedo}
            className="source-results-button redo-button"
          >
            {HEBREW_TEXT.redoSearch}
          </button>
          <button
            onClick={onDiscard}
            className="source-results-button discard-button"
          >
            {HEBREW_TEXT.discard}
          </button>
        </div>
      )}
    </div>
  );
};

export default SourceResultsDisplay;
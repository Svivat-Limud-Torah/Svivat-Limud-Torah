// frontend/src/components/TranscriptionInputModal.jsx
import React, { useState, useEffect } from 'react';
import './TranscriptionInputModal.css';
import { HEBREW_TEXT } from '../utils/constants';
import TranscriptionResultView from './TranscriptionResultView'; // Import result view

export default function TranscriptionInputModal({
  isOpen,
  onClose,
  onSubmitTranscription,
  isLoading,
  processedText,
  processingError,
  onSaveProcessedText,
  onClearProcessedText, // New prop to clear results and show input again
  processingMode
}) {
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    // If modal opens and there's already processed text (e.g. error occurred, user wants to retry saving)
    // don't clear input text. Only clear if no processed text.
    if (isOpen && !processedText && !processingError) {
      setInputText('');
    }
  }, [isOpen, processedText, processingError]);

  if (!isOpen) return null;

  const handleSubmit = (operation) => {
    if (!inputText.trim()) {
        alert(HEBREW_TEXT.pleaseEnterText);
        return;
    }
    onSubmitTranscription(inputText, operation);
  };

  const handleSave = async () => {
    const success = await onSaveProcessedText(processedText, processingMode);
    if (success) {
        onClose(); // Close modal on successful save
    }
    // If save fails or is cancelled, the modal remains open with the processed text.
  };
  
  const handleDiscardOrTryAgain = () => {
    onClearProcessedText(); // Clears results, allows new input or retry
    // If it was an error, inputText is preserved.
    // If it was a discard of successful results, input text would ideally be cleared or user starts fresh.
    // The current logic preserves input text when onClearProcessedText is called.
  };


  // If there's processed text or an error, show the result view within the modal
  if (processedText || processingError) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content transcription-modal" onClick={(e) => e.stopPropagation()}>
          <TranscriptionResultView
            processedText={processedText}
            isLoading={false} //isLoading prop on parent is for the API call, not this view
            error={processingError}
            onSave={handleSave}
            onDiscard={handleDiscardOrTryAgain}
            processingMode={processingMode}
          />
          <div className="modal-actions transcription-result-actions">
            <button onClick={onClose} className="close-button">{HEBREW_TEXT.close}</button>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show the input form
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content transcription-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{HEBREW_TEXT.transcriptionModalTitle}</h2>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={HEBREW_TEXT.pasteTranscriptionPlaceholder}
          rows={15}
          disabled={isLoading}
          className="transcription-input-textarea"
        />
        <div className="modal-actions transcription-input-actions">
          <button 
            onClick={() => handleSubmit('organize')} 
            disabled={isLoading || !inputText.trim()}
            className="action-button organize-button"
          >
            {isLoading && processingMode === 'organize' ? HEBREW_TEXT.loading : HEBREW_TEXT.organizeTextButton}
          </button>
          <button 
            onClick={() => handleSubmit('summarize')} 
            disabled={isLoading || !inputText.trim()}
            className="action-button summarize-button"
          >
            {isLoading && processingMode === 'summarize' ? HEBREW_TEXT.loading : HEBREW_TEXT.summarizeTextButton}
          </button>
          <button onClick={onClose} disabled={isLoading} className="cancel-button">{HEBREW_TEXT.cancel}</button>
        </div>
         {isLoading && <div className="loading-indicator">{HEBREW_TEXT.processingTranscription}</div>}
      </div>
    </div>
  );
}

// frontend/src/components/SmartSearchModal.jsx
import React, { useState } from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './SmartSearchModal.css'; // We'll create this CSS file next

const SmartSearchModal = ({
  isOpen,
  onClose,
  onPerformSearch,
  isLoading,
  searchResults,
  searchError,
}) => {
  const [query, setQuery] = useState('');
  const [numFilesToScan, setNumFilesToScan] = useState(2); // Default to 2 files

  if (!isOpen) {
    return null;
  }

  const handleSearch = () => {
    if (query.trim()) {
      onPerformSearch(query, numFilesToScan);
    }
  };

  const renderResults = () => {
    if (isLoading) {
      // Loading message will be handled by global loading message in useAiFeatures
      // but we can show a spinner here.
      return <div className="smart-search-spinner"></div>;
    }
    if (searchError) {
      return <p className="smart-search-error">{HEBREW_TEXT.smartSearchErrorPrefix} {searchError}</p>;
    }
    if (searchResults) {
      if (searchResults.notFound) {
        return (
          <div>
            <p>{HEBREW_TEXT.smartSearchNotFound}</p>
            {searchResults.filesSearched && searchResults.filesSearched.length > 0 && (
              <p>{HEBREW_TEXT.smartSearchFilesScanned} {searchResults.filesSearched.join(', ')}</p>
            )}
          </div>
        );
      }
      if (searchResults.quote) {
        return (
          <div className="smart-search-results-content">
            {searchResults.isApproximate && <p className="smart-search-approximate"><i>(תוצאה משוערת)</i></p>}
            <p><strong>{HEBREW_TEXT.smartSearchResultQuote}</strong> {searchResults.quote}</p>
            <p><strong>{HEBREW_TEXT.smartSearchResultExplanation}</strong> {searchResults.explanation}</p>
            <p><strong>{HEBREW_TEXT.smartSearchResultSource}</strong> {searchResults.sourceFile}</p>
            <p><strong>{HEBREW_TEXT.smartSearchResultLine}</strong> {searchResults.lineNumber}</p>
            {searchResults.filesSearched && searchResults.filesSearched.length > 0 && (
              <p><strong>{HEBREW_TEXT.smartSearchFilesScanned}</strong> {searchResults.filesSearched.join(', ')}</p>
            )}
          </div>
        );
      }
    }
    return <p>{HEBREW_TEXT.smartSearchInitialMessage}</p>;
  };

  return (
    <div className="smart-search-modal-overlay">
      <div className="smart-search-modal-content">
        <h2>{HEBREW_TEXT.smartSearchModalTitle}</h2>
        <textarea
          className="smart-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={HEBREW_TEXT.smartSearchInputPlaceholder}
          rows="3"
          disabled={isLoading}
        />
        <div className="smart-search-config-item">
          <label htmlFor="numFilesToScanInput">{HEBREW_TEXT.smartSearchNumFilesLabel || 'מספר קבצים לסריקה:'}</label>
          <input
            type="number"
            id="numFilesToScanInput"
            value={numFilesToScan}
            onChange={(e) => setNumFilesToScan(Math.max(1, parseInt(e.target.value, 10) || 1))} // Ensure positive integer
            min="1"
            max="20" // Arbitrary max, can be adjusted
            disabled={isLoading}
            className="smart-search-numfiles-input"
          />
        </div>
        <div className="smart-search-modal-actions">
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="btn btn-primary"
          >
            {HEBREW_TEXT.smartSearchModalSearchButton}
          </button>
          <button onClick={onClose} disabled={isLoading} className="btn btn-secondary">
            {HEBREW_TEXT.close}
          </button>
        </div>
        <div className="smart-search-results-area">
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default SmartSearchModal;

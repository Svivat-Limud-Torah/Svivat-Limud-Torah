// frontend/src/components/SmartSearchModal.jsx
import React, { useState } from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './SmartSearchModal.css';

const SmartSearchModal = ({
  isOpen,
  onClose,
  onPerformSearch,
  isLoading,
  searchResults,
  searchError,
  onOpenFile,
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('deep'); // 'local' or 'deep'

  if (!isOpen) return null;

  const handleSearch = () => {
    if (query.trim()) {
      onPerformSearch(query, 5, mode);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const renderResults = () => {
    if (isLoading) {
      return (
        <div className="ss-loading">
          <div className="ss-spinner"></div>
          <span>{mode === 'deep' ? HEBREW_TEXT.smartSearchLoadingAI : HEBREW_TEXT.smartSearchLoadingLocal}</span>
        </div>
      );
    }

    if (searchError) {
      return <div className="ss-error">{HEBREW_TEXT.smartSearchErrorPrefix} {searchError}</div>;
    }

    if (!searchResults) {
      return <div className="ss-initial">{HEBREW_TEXT.smartSearchInitialMessage}</div>;
    }

    if (searchResults.notFound) {
      return (
        <div className="ss-not-found">
          <span className="ss-not-found-icon"></span>
          <p>{searchResults.reason || HEBREW_TEXT.smartSearchNotFound}</p>
          {searchResults.keywords && searchResults.keywords.length > 0 && (
            <div className="ss-keywords">
              <strong>{HEBREW_TEXT.smartSearchKeywords}</strong> {searchResults.keywords.join(', ')}
            </div>
          )}
        </div>
      );
    }

    if (searchResults.found && searchResults.results) {
      return (
        <div className="ss-results-container">
          {/* Meta info */}
          <div className="ss-meta">
            <span>{HEBREW_TEXT.smartSearchResultsCount(searchResults.results.length)}</span>
            {searchResults.duration && <span>{HEBREW_TEXT.smartSearchDuration(searchResults.duration)}</span>}
            {searchResults.filesScanned && (
              <span>{HEBREW_TEXT.smartSearchFilesScanned} {searchResults.filesScanned}/{searchResults.totalFiles}</span>
            )}
          </div>

          {/* Summary from AI */}
          {searchResults.summary && (
            <div className="ss-summary">
              <strong>{HEBREW_TEXT.smartSearchSummary}</strong> {searchResults.summary}
            </div>
          )}

          {/* Result cards */}
          <div className="ss-results-list">
            {searchResults.results.map((result, index) => (
              <div
                key={index}
                className={`ss-result-card${onOpenFile ? ' ss-result-card--clickable' : ''}`}
                onClick={() => onOpenFile && onOpenFile(result)}
                title={onOpenFile ? 'לחץ לפתיחת הקובץ' : undefined}
              >
                <div className="ss-result-header">
                  <span className="ss-result-number">#{index + 1}</span>
                  <span className="ss-result-file" title={result.sourceFile}>
                    {result.fileName || result.sourceFile}
                  </span>
                  {result.lineNumber && (
                    <span className="ss-result-line">שורה {result.lineNumber}</span>
                  )}
                  {result.relevanceScore && (
                    <span className="ss-result-score">{result.relevanceScore}%</span>
                  )}
                </div>
                {result.quote && (
                  <div className="ss-result-quote">
                    {result.quote}
                  </div>
                )}
                {result.explanation && (
                  <div className="ss-result-explanation">{result.explanation}</div>
                )}
                {result.context && !result.explanation && (
                  <div className="ss-result-context">
                    <pre>{result.context}</pre>
                  </div>
                )}
                {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                  <div className="ss-result-keywords">
                    {result.matchedKeywords.map((kw, i) => (
                      <span key={i} className="ss-keyword-tag">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Related terms */}
          {searchResults.relatedTerms && searchResults.relatedTerms.length > 0 && (
            <div className="ss-related">
              <strong>{HEBREW_TEXT.smartSearchRelatedTerms}</strong>
              <div className="ss-related-tags">
                {searchResults.relatedTerms.map((term, i) => (
                  <button
                    key={i}
                    className="ss-related-tag"
                    onClick={() => { setQuery(term); }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keywords used */}
          {searchResults.keywords && searchResults.keywords.length > 0 && (
            <div className="ss-keywords-used">
              <strong>{HEBREW_TEXT.smartSearchKeywords}</strong> {searchResults.keywords.join(', ')}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="ss-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ss-modal">
        <div className="ss-header">
          <h2>{HEBREW_TEXT.smartSearchModalTitle}</h2>
          <button className="ss-close-btn" onClick={onClose} disabled={isLoading}>✕</button>
        </div>

        <div className="ss-search-bar">
          <textarea
            className="ss-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={HEBREW_TEXT.smartSearchInputPlaceholder}
            rows="2"
            disabled={isLoading}
            autoFocus
          />
          <div className="ss-controls">
            <div className="ss-mode-toggle">
              <button
                className={`ss-mode-btn ${mode === 'local' ? 'active' : ''}`}
                onClick={() => setMode('local')}
                disabled={isLoading}
                title={HEBREW_TEXT.smartSearchModeLocal}
              >
                ⚡ מהיר
              </button>
              <button
                className={`ss-mode-btn ${mode === 'deep' ? 'active' : ''}`}
                onClick={() => setMode('deep')}
                disabled={isLoading}
                title={HEBREW_TEXT.smartSearchModeDeep}
              >
                עמוק
              </button>
            </div>
            <button
              className="ss-search-btn"
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
            >
              {HEBREW_TEXT.smartSearchModalSearchButton}
            </button>
          </div>
        </div>

        <div className="ss-results-area">
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default SmartSearchModal;

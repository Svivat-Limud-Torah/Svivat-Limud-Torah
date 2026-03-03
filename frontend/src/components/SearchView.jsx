// frontend/src/components/SearchView.jsx
import React, { useState, useMemo } from 'react';
import path from '../utils/pathUtils';
import { HEBREW_TEXT } from '../utils/constants';
import './SearchView.css';

// Render highlighted match preview with @@MATCH_START@@/@@MATCH_END@@ markers
const HighlightedPreview = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(@@MATCH_START@@|@@MATCH_END@@)/g);
  let hl = false;
  return (
    <>
      {parts.map((p, i) => {
        if (p === '@@MATCH_START@@') { hl = true; return null; }
        if (p === '@@MATCH_END@@') { hl = false; return null; }
        return hl
          ? <span key={i} className="sv-highlight">{p}</span>
          : <span key={i}>{p}</span>;
      })}
    </>
  );
};

const SearchView = ({
  searchTerm,
  setSearchTerm,
  searchInputRef,
  searchResults,
  isSearching,
  searchError,
  currentSearchScope,
  clearSearchScope,
  handleSearch,
  searchOptions,
  handleSearchOptionChange,
  includePatternsInput,
  handleIncludePatternsChange,
  excludePatternsInput,
  handleExcludePatternsChange,
  handleFileSelect,
  workspaceFolders,
}) => {
  const [collapsedFiles, setCollapsedFiles] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const toggleCollapse = (key) => {
    setCollapsedFiles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalMatches = useMemo(
    () => searchResults.reduce((sum, f) => sum + f.matches.length, 0),
    [searchResults]
  );

  const scopeLabel = currentSearchScope.basePath
    ? (currentSearchScope.name || path.basename(currentSearchScope.basePath))
    : null;

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const onMatchClick = (fileResult, lineNumber) => {
    const targetFolder = { path: fileResult.originalRootPath, name: fileResult.rootName };
    const item = { name: fileResult.fileName, path: fileResult.relativePath.replace(/\\/g, '/') };
    handleFileSelect(targetFolder, item, lineNumber, searchTerm);
  };

  return (
    <div className="sv-container">
      {/* Header */}
      <div className="sv-header">
        <div className="sv-header-row">
          <h2 className="sv-title">
            {scopeLabel ? HEBREW_TEXT.searchIn(scopeLabel) : HEBREW_TEXT.search}
          </h2>
          {scopeLabel && (
            <div className="sv-scope-badge">
              <span>{scopeLabel}</span>
              <button className="sv-scope-clear" onClick={clearSearchScope} title={HEBREW_TEXT.clearSearchScope}>✕</button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="sv-search-bar">
          <span className="sv-search-icon"></span>
          <input
            ref={searchInputRef}
            className="sv-search-input"
            type="text"
            placeholder={HEBREW_TEXT.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            className="sv-search-btn"
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
          >
            {isSearching ? HEBREW_TEXT.searching : HEBREW_TEXT.search}
          </button>
        </div>

        {/* Options */}
        <div className="sv-options">
          <label className={`sv-option-chip ${searchOptions.isRegex ? 'is-active' : ''}`}>
            <input type="checkbox" checked={searchOptions.isRegex} onChange={(e) => handleSearchOptionChange('isRegex', e.target.checked)} />
            .* {HEBREW_TEXT.regex}
          </label>
          <label className={`sv-option-chip ${searchOptions.caseSensitive ? 'is-active' : ''}`}>
            <input type="checkbox" checked={searchOptions.caseSensitive} onChange={(e) => handleSearchOptionChange('caseSensitive', e.target.checked)} />
            Aa {HEBREW_TEXT.caseSensitive}
          </label>
          <label className={`sv-option-chip ${searchOptions.wholeWord ? 'is-active' : ''} ${searchOptions.isRegex ? 'is-disabled' : ''}`}>
            <input type="checkbox" checked={searchOptions.wholeWord} onChange={(e) => handleSearchOptionChange('wholeWord', e.target.checked)} disabled={searchOptions.isRegex} />
            [ab] {HEBREW_TEXT.wholeWord}
          </label>
          <button className="sv-filters-toggle" onClick={() => setShowFilters(p => !p)}>
            {showFilters ? '▴ הסתר מסננים' : '▾ מסננים מתקדמים'}
          </button>
        </div>

        {/* Filter Patterns */}
        {showFilters && (
          <div className="sv-filters">
            <div className="sv-filter-group">
              <label className="sv-filter-label">{HEBREW_TEXT.includeFiles}</label>
              <input
                className="sv-filter-input"
                type="text"
                value={includePatternsInput || ''}
                onChange={(e) => handleIncludePatternsChange(e.target.value)}
                placeholder={HEBREW_TEXT.includePlaceholder}
              />
            </div>
            <div className="sv-filter-group">
              <label className="sv-filter-label">{HEBREW_TEXT.excludeFiles}</label>
              <input
                className="sv-filter-input"
                type="text"
                value={excludePatternsInput || ''}
                onChange={(e) => handleExcludePatternsChange(e.target.value)}
                placeholder={HEBREW_TEXT.excludePlaceholder}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Meta */}
      {searchResults.length > 0 && (
        <div className="sv-meta">
          <span className="sv-meta-count">
            {HEBREW_TEXT.searchResultsCount(totalMatches, searchResults.length)}
          </span>
        </div>
      )}

      {/* Results Area */}
      <div className="sv-results">
        {/* Error */}
        {searchError && !isSearching && (
          <div className="sv-error">{searchError}</div>
        )}

        {/* Loading */}
        {isSearching && (
          <div className="sv-loading">
            <div className="sv-spinner" />
            {HEBREW_TEXT.searching}
          </div>
        )}

        {/* Results */}
        {!isSearching && searchResults.map((fileResult, idx) => {
          const key = `${fileResult.searchRootPath}::${fileResult.relativePath}::${idx}`;
          const isCollapsed = collapsedFiles[key];
          const displayPath = `${fileResult.rootName} / ${fileResult.relativePath}`;

          return (
            <div key={key} className="sv-file-card">
              <div className="sv-file-header" onClick={() => onMatchClick(fileResult, fileResult.matches[0]?.lineNumber)}>
                <span className="sv-file-icon"></span>
                <span className="sv-file-name" title={displayPath}>{displayPath}</span>
                <span className="sv-file-match-count">{fileResult.matches.length} התאמות</span>
                <button
                  className={`sv-file-collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleCollapse(key); }}
                  title={isCollapsed ? 'הרחב' : 'צמצם'}
                >
                  ▾
                </button>
              </div>

              {!isCollapsed && (
                <div className="sv-matches">
                  {fileResult.matches.map((match, mIdx) => (
                    <div
                      key={`${match.lineNumber}-${mIdx}`}
                      className="sv-match"
                      onClick={() => onMatchClick(fileResult, match.lineNumber)}
                      title={`עבור לשורה ${match.lineNumber}`}
                    >
                      <span className="sv-match-line-num">{match.lineNumber}</span>
                      <div className="sv-match-content">
                        {match.contextBefore?.map((line, i) => (
                          <div key={`cb-${i}`} className="sv-match-context-line">{line}</div>
                        ))}
                        <div className="sv-match-main-line">
                          <HighlightedPreview text={match.matchPreview} />
                        </div>
                        {match.contextAfter?.map((line, i) => (
                          <div key={`ca-${i}`} className="sv-match-context-line">{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty states */}
        {!isSearching && searchResults.length === 0 && !searchError && searchTerm && (
          <div className="sv-empty-state">
            <p className="sv-empty-text">{HEBREW_TEXT.noResultsFound}</p>
          </div>
        )}

        {!searchTerm && !isSearching && !searchError && searchResults.length === 0 && (
          <div className="sv-empty-state">
            <p className="sv-empty-text">{HEBREW_TEXT.searchPlaceholder}</p>
          </div>
        )}

        {workspaceFolders.length === 0 && (
          <div className="sv-empty-state">
            <p className="sv-empty-text">{HEBREW_TEXT.addFolderFirst || 'הוסף תיקייה כדי לבצע חיפוש.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;

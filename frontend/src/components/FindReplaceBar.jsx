// frontend/src/components/FindReplaceBar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, openSearchPanel } from '@codemirror/search';
import './FindReplaceBar.css';

const FindReplaceBar = ({ editorViewRef, isVisible, initialMode, isRtl, onClose }) => {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matchInfo, setMatchInfo] = useState({ total: 0, current: 0 });
  const [invalidRegex, setInvalidRegex] = useState(false);

  const searchInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  // When opened: set mode, populate from selection, focus input
  useEffect(() => {
    if (!isVisible) return;
    setShowReplace(initialMode === 'replace');
    setInvalidRegex(false);

    const view = editorViewRef.current;
    if (view) {
      const sel = view.state.selection.main;
      if (sel.from !== sel.to) {
        const selected = view.state.doc.sliceString(sel.from, sel.to);
        if (selected.length < 300 && !selected.includes('\n')) {
          setSearchText(selected);
        }
      }
    }

    setTimeout(() => {
      if (initialMode === 'replace') {
        replaceInputRef.current?.focus();
      } else {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }, 40);
  }, [isVisible, initialMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update CodeMirror search query whenever anything changes
  const applyQuery = useCallback((search, replace, cs, ww, rx) => {
    const view = editorViewRef.current;
    if (!view) return;

    if (!search) {
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
      setMatchInfo({ total: 0, current: 0 });
      setInvalidRegex(false);
      return;
    }

    let query;
    try {
      query = new SearchQuery({ search, caseSensitive: cs, wholeWord: ww, regexp: rx, replace: replace || '' });
      setInvalidRegex(false);
    } catch {
      // Invalid regex
      setInvalidRegex(true);
      return;
    }

    // Ensure CodeMirror's internal search panel is "open" so it renders match decorations.
    // Our createPanel returns a hidden div, so this is invisible to the user.
    openSearchPanel(view);
    view.dispatch({ effects: setSearchQuery.of(query) });
    requestAnimationFrame(() => refreshMatchInfo(view));
  }, [editorViewRef]);

  useEffect(() => {
    if (isVisible) {
      applyQuery(searchText, replaceText, caseSensitive, wholeWord, useRegex);
    }
  }, [searchText, replaceText, caseSensitive, wholeWord, useRegex, isVisible, applyQuery]);

  const refreshMatchInfo = (view) => {
    const matches = view.dom.querySelectorAll('.cm-searchMatch');
    const selected = view.dom.querySelector('.cm-searchMatch-selected');
    const total = matches.length;
    let current = 0;
    if (selected) {
      current = Array.from(matches).indexOf(selected) + 1;
    }
    setMatchInfo({ total, current });
  };

  const handleNext = useCallback(() => {
    const view = editorViewRef.current;
    if (!view || !searchText) return;
    findNext(view);
    requestAnimationFrame(() => refreshMatchInfo(view));
  }, [editorViewRef, searchText]);

  const handlePrev = useCallback(() => {
    const view = editorViewRef.current;
    if (!view || !searchText) return;
    findPrevious(view);
    requestAnimationFrame(() => refreshMatchInfo(view));
  }, [editorViewRef, searchText]);

  const handleReplaceOne = useCallback(() => {
    const view = editorViewRef.current;
    if (!view || !searchText) return;
    replaceNext(view);
    requestAnimationFrame(() => refreshMatchInfo(view));
  }, [editorViewRef, searchText]);

  const handleReplaceAll = useCallback(() => {
    const view = editorViewRef.current;
    if (!view || !searchText) return;
    replaceAll(view);
    requestAnimationFrame(() => refreshMatchInfo(view));
  }, [editorViewRef, searchText]);

  const handleClose = useCallback(() => {
    const view = editorViewRef.current;
    if (view) {
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
      setTimeout(() => view.focus(), 30);
    }
    setSearchText('');
    setReplaceText('');
    setMatchInfo({ total: 0, current: 0 });
    setInvalidRegex(false);
    onClose();
  }, [editorViewRef, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) handlePrev();
      else handleNext();
    }
  }, [handleClose, handleNext, handlePrev]);

  if (!isVisible) return null;

  const noResults = searchText.length > 0 && matchInfo.total === 0 && !invalidRegex;
  const countLabel = invalidRegex
    ? '⚠'
    : matchInfo.total > 0
      ? `${matchInfo.current}/${matchInfo.total}`
      : noResults ? 'אין' : '';

  return (
    <div
      className="fr-bar"
      style={{ [isRtl ? 'left' : 'right']: '12px' }}
      onKeyDown={handleKeyDown}
    >
      {/* ── Find row ── */}
      <div className="fr-row">
        <div className={`fr-input-wrap${noResults || invalidRegex ? ' fr-input-wrap--error' : ''}`}>
          <input
            ref={searchInputRef}
            className="fr-input"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="חפש..."
            spellCheck={false}
            dir="auto"
            autoComplete="off"
          />
          <div className="fr-opts">
            <button
              className={`fr-opt${caseSensitive ? ' fr-opt--on' : ''}`}
              onClick={() => setCaseSensitive(v => !v)}
              title="תלוי רישיות"
            >Aa</button>
            <button
              className={`fr-opt${wholeWord ? ' fr-opt--on' : ''}`}
              onClick={() => setWholeWord(v => !v)}
              title="מילה שלמה"
            >|W|</button>
            <button
              className={`fr-opt${useRegex ? ' fr-opt--on' : ''}`}
              onClick={() => setUseRegex(v => !v)}
              title="ביטוי רגולרי"
            >.*</button>
          </div>
        </div>

        <span className={`fr-count${noResults ? ' fr-count--none' : invalidRegex ? ' fr-count--warn' : ''}`}>
          {countLabel}
        </span>

        <button className="fr-nav" onClick={handlePrev} title="קודם (Shift+Enter)">↑</button>
        <button className="fr-nav" onClick={handleNext} title="הבא (Enter)">↓</button>

        <button
          className={`fr-replace-toggle${showReplace ? ' fr-replace-toggle--on' : ''}`}
          onClick={() => setShowReplace(v => !v)}
          title="פתח/סגור החלפה (Ctrl+H)"
        >⇄</button>

        <button className="fr-close" onClick={handleClose} title="סגור (Esc)">✕</button>
      </div>

      {/* ── Replace row ── */}
      {showReplace && (
        <div className="fr-row fr-row--replace">
          <div className="fr-input-wrap fr-input-wrap--replace">
            <input
              ref={replaceInputRef}
              className="fr-input"
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="החלף ב..."
              spellCheck={false}
              dir="auto"
              autoComplete="off"
            />
          </div>
          <button
            className="fr-action"
            onClick={handleReplaceOne}
            disabled={!searchText || invalidRegex}
            title="החלף אחד (Enter)"
          >החלף</button>
          <button
            className="fr-action"
            onClick={handleReplaceAll}
            disabled={!searchText || invalidRegex}
            title="החלף הכל"
          >הכל</button>
        </div>
      )}
    </div>
  );
};

export default FindReplaceBar;

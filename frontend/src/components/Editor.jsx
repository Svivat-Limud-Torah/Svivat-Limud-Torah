// frontend/src/components/Editor.jsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import { EditorState, Compartment, StateField, StateEffect } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, Decoration } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches, SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, search } from '@codemirror/search';
import FindReplaceBar from './FindReplaceBar';
import { ANNOTATION_COLORS } from '../hooks/useAnnotations';

import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { DEFAULT_FONT_SIZE_PX } from '../utils/constants';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import SelectedTextContextMenu from './SelectedTextContextMenu';

// --- Annotation decoration system ---
const setAnnotationsEffect = StateEffect.define();

const annotationField = StateField.define({
  create() { return Decoration.none; },
  update(decos, tr) {
    for (const e of tr.effects) {
      if (e.is(setAnnotationsEffect)) {
        return e.value;
      }
    }
    return decos.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f),
});

const annotationTheme = EditorView.baseTheme({
  '.cm-annotation-yellow': { backgroundColor: 'rgba(250, 204, 21, 0.35)', borderBottom: '2px solid #facc15', borderRadius: '2px' },
  '.cm-annotation-green': { backgroundColor: 'rgba(74, 222, 128, 0.30)', borderBottom: '2px solid #4ade80', borderRadius: '2px' },
  '.cm-annotation-blue': { backgroundColor: 'rgba(96, 165, 250, 0.30)', borderBottom: '2px solid #60a5fa', borderRadius: '2px' },
  '.cm-annotation-pink': { backgroundColor: 'rgba(244, 114, 182, 0.30)', borderBottom: '2px solid #f472b6', borderRadius: '2px' },
  '.cm-annotation-orange': { backgroundColor: 'rgba(251, 146, 60, 0.30)', borderBottom: '2px solid #fb923c', borderRadius: '2px' },
  '.cm-annotation-selected': { outline: '2px solid var(--theme-accent-primary, #60a5fa)', outlineOffset: '1px' },
});
// --- End annotation decoration system ---

// Helper: find text in a CodeMirror doc, preferring a line near hintLineNumber
function findTextInDoc(doc, text, hintLineNumber) {
  if (!text) return null;
  const docStr = doc.toString();
  const matches = [];
  let idx = docStr.indexOf(text);
  while (idx !== -1) {
    matches.push({ from: idx, to: idx + text.length });
    idx = docStr.indexOf(text, idx + 1);
  }
  if (matches.length === 0) return null;
  if (matches.length === 1 || !hintLineNumber) return matches[0];
  // Pick the match closest to the hint line
  let best = matches[0];
  let bestDist = Infinity;
  for (const m of matches) {
    const line = doc.lineAt(m.from).number;
    const dist = Math.abs(line - hintLineNumber);
    if (dist < bestDist) { bestDist = dist; best = m; }
  }
  return best;
}

let lineNumbersCompartment = new Compartment();
let activeLineGutterCompartment = new Compartment();
let directionCompartment = new Compartment();
let baseThemeCompartment = new Compartment(); // Compartment for base editor styles like font size

// Helper function to create base theme extension
const createBaseTheme = (fontSize, fontFamily, showLineNumbers, isRtl) => {
  return EditorView.theme({
    '.cm-editor': {
      backgroundColor: 'var(--theme-editor-bg) !important',
      color: 'var(--theme-editor-text) !important',
      paddingRight: !showLineNumbers && isRtl ? '5px !important' : undefined,
      paddingLeft: !showLineNumbers && !isRtl ? '5px !important' : undefined,
    },
    '.cm-scroller': {
      backgroundColor: 'var(--theme-editor-bg) !important',
    },
    '.cm-content': { // Target the actual content area
      fontSize: `${fontSize}px !important`, // Add !important to ensure override
      fontFamily: fontFamily ? `${fontFamily}, monospace !important` : undefined,
      color: 'var(--theme-editor-text) !important', // Use theme editor text color (pure black/white)
      backgroundColor: 'var(--theme-editor-bg) !important',
      caretColor: '#ffffff !important',
      // Add subtle padding when line numbers are off, especially for RTL
      paddingRight: !showLineNumbers && isRtl ? '12px !important' : undefined,
      paddingLeft: !showLineNumbers && !isRtl ? '12px !important' : undefined,
    },
    // Adjust line numbers (gutters) to match the content font size AND USE THEME COLORS
    '.cm-gutters': {
      fontSize: `${fontSize}px !important`, // Match the content font size
      fontFamily: fontFamily ? `${fontFamily}, monospace !important` : undefined,
      backgroundColor: 'var(--theme-button-bg) !important', // Use theme button background
      color: 'var(--theme-button-text-color) !important',    // Use theme button text color
      borderRight: '1px solid var(--theme-button-bg) !important' // Use theme border
    },
    // Line number text color
    '.cm-lineNumbers .cm-gutterElement': {
      color: 'var(--theme-button-text-color) !important'
    },
    // Active line number (current line where cursor is)
    '.cm-lineNumbers .cm-gutterElement.cm-activeLineGutter': {
      color: 'var(--theme-button-text-color) !important',
      backgroundColor: 'var(--theme-button-bg) !important'
    },
    // Alternative selector for active line gutter
    '.cm-activeLineGutter': {
      color: 'var(--theme-button-text-color) !important',
      backgroundColor: 'var(--theme-button-bg) !important'
    },
    // Ensure editor text uses the theme color throughout
    '.cm-line': {
      color: 'var(--theme-editor-text) !important'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03) !important',
    },
  });
};


const Editor = forwardRef(({
  filePath,
  initialContent,
  onChange,
  isRtl,
  searchTermToHighlight,
  scrollToLine,
  showLineNumbers = true,
  highlightActiveLine: enableHighlightActiveLineGutter = true,
  currentFontSize, // Font size for the entire editor
  editorFont, // Font family for the editor
  initialScrollPosition = 0, // Initial scroll position
  onScrollPositionChange, // Callback for scroll position changes
  // New props for selected text AI features
  onSelectedTextPilpulta,
  onSelectedTextFindSources,
  onSelectedTextFlashcards,
  onSelectedTextSummary,
  onSelectedTextOrganize,
  isAnyAiFeatureLoading,
  onCursorChange,
  // Annotation props
  annotations,
  isAnnotationMode,
  onAddAnnotation,
  onAddBookmark,
  selectedAnnotationId,
}, ref) => {
  const editorRef = useRef(null);
  const editorViewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onCursorChangeRef = useRef(onCursorChange);
  const isInternalChangeRef = useRef(false);

  // Find & Replace panel state
  const [findReplaceVisible, setFindReplaceVisible] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState('find');
  const findReplaceCallbackRef = useRef(null);

  useEffect(() => {
    findReplaceCallbackRef.current = (mode) => {
      setFindReplaceMode(mode || 'find');
      setFindReplaceVisible(true);
    };
  }, []);

  // State for context menu
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedText: ''
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Handle selected text AI feature calls
  const handleSelectedTextAI = useCallback((action) => {
    const selectedText = contextMenu.selectedText;
    if (selectedText && action) {
      action(selectedText);
    }
  }, [contextMenu.selectedText]);

  useImperativeHandle(ref, () => ({
    getSelectionRange: () => {
      if (editorViewRef.current) {
        const { from, to } = editorViewRef.current.state.selection.main;
        // Ensure `from` is always less than or equal to `to` for consistent range handling.
        // CodeMirror selections can be "backwards" if selected from right to left.
        return { from: Math.min(from, to), to: Math.max(from, to) };
      }
      return null;
    },
    getSelectedText: () => {
      if (editorViewRef.current) {
        const selection = editorViewRef.current.state.selection.main;
        if (selection.from !== selection.to) {
          return editorViewRef.current.state.doc.sliceString(selection.from, selection.to);
        }
      }
      return '';
    },
    // Add access to the CodeMirror view for external manipulation
    getEditorView: () => editorViewRef.current,
    // Expose the editorViewRef for direct access
    editorViewRef: editorViewRef,
    // Method to open the search panel
    openSearch: () => {
      findReplaceCallbackRef.current?.('find');
      return true;
    },
    // Scroll position methods
    getScrollPosition: () => {
      if (editorViewRef.current) {
        const scrollDOM = editorViewRef.current.scrollDOM;
        return scrollDOM.scrollTop;
      }
      return 0;
    },
    setScrollPosition: (position) => {
      if (editorViewRef.current) {
        const scrollDOM = editorViewRef.current.scrollDOM;
        scrollDOM.scrollTop = position;
      }
    },
    // Potentially add other methods here if needed, e.g., focus, setContent directly
  }));

  useEffect(() => {
    if (!editorRef.current) return;

    // Initial base theme using the prop or fallback to constant
    const initialBaseTheme = createBaseTheme(currentFontSize || DEFAULT_FONT_SIZE_PX, editorFont, showLineNumbers, isRtl);

    const getLanguageExtension = (path) => {
      if (!path) return null;
      const extension = path.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'js': case 'jsx': return javascript({ jsx: true, typescript: false });
        case 'ts': case 'tsx': return javascript({ jsx: true, typescript: true });
        case 'html': return html();
        case 'css': return css();
        case 'md': return markdown({ base: markdownLanguage, codeLanguages: languages });
        default: return null;
      }
    };
    const languageExtension = getLanguageExtension(filePath);

    // Custom keymap to override default search behavior
    const customSearchKeymap = keymap.of([
      {
        key: "Ctrl-f",
        run: () => { findReplaceCallbackRef.current?.('find'); return true; }
      },
      {
        key: "Ctrl-כ", // Hebrew כ key
        run: () => { findReplaceCallbackRef.current?.('find'); return true; }
      },
      {
        key: "Ctrl-h",
        run: () => { findReplaceCallbackRef.current?.('replace'); return true; }
      },
      {
        key: "Ctrl-ח", // Hebrew ח key
        run: () => { findReplaceCallbackRef.current?.('replace'); return true; }
      },
    ]);

    const extensions = [
      directionCompartment.of(EditorView.contentAttributes.of({ dir: isRtl ? 'rtl' : 'ltr' })),
      lineNumbersCompartment.of(showLineNumbers ? lineNumbers() : []),
      activeLineGutterCompartment.of(showLineNumbers && enableHighlightActiveLineGutter ? highlightActiveLineGutter() : []),
      baseThemeCompartment.of(initialBaseTheme), // Add base theme compartment
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      history(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightSelectionMatches(),
      search({
        createPanel: (_view) => {
          // Create an invisible placeholder panel so CodeMirror's search state
          // (SearchQuery, findNext, etc.) is fully available, but our custom
          // React FindReplaceBar handles the visible UI instead.
          const dom = document.createElement('div');
          dom.style.cssText = 'display:none;height:0;overflow:hidden;padding:0;margin:0;';
          return { dom };
        },
      }),
      customSearchKeymap, // Add custom search keymap first
      keymap.of([
        ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap,
        ...historyKeymap, ...foldKeymap, ...completionKeymap,
        ...lintKeymap, indentWithTab,
      ]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          isInternalChangeRef.current = true;
          onChangeRef.current(update.state.doc.toString());
          setTimeout(() => {
            isInternalChangeRef.current = false;
          }, 0);
        }
        if ((update.selectionSet || update.docChanged) && onCursorChangeRef.current) {
          const pos = update.state.selection.main.head;
          const lineObj = update.state.doc.lineAt(pos);
          onCursorChangeRef.current({ line: lineObj.number, col: pos - lineObj.from + 1 });
        }
      }),
    ];

    if (languageExtension) {
      extensions.push(languageExtension);
    } else {
      // If no specific language, still include some basic features
      extensions.push(highlightSpecialChars());
    }

    // Always include annotation support
    extensions.push(annotationField, annotationTheme);

    const startState = EditorState.create({
      doc: initialContent || '',
      extensions: extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    // Add context menu handler for selected text
    const handleContextMenu = (event) => {
      const selection = view.state.selection.main;
      if (selection.from !== selection.to) {
        const selectedText = view.state.doc.sliceString(selection.from, selection.to).trim();
        if (selectedText && (onSelectedTextPilpulta || isAnnotationMode || onAddBookmark)) { // Show for AI features OR annotation mode OR bookmarks
          event.preventDefault();
          setContextMenu({
            isVisible: true,
            position: { x: event.clientX, y: event.clientY },
            selectedText: selectedText
          });
        }
      }
    };

    // Add the context menu event listener
    view.dom.addEventListener('contextmenu', handleContextMenu);

    // Restore scroll position after editor is fully rendered
    setTimeout(() => {
      if (editorViewRef.current && initialScrollPosition > 0) {
        const scrollDOM = editorViewRef.current.scrollDOM;
        scrollDOM.scrollTop = initialScrollPosition;
      }
    }, 100);

    // Add scroll event listener to save scroll position
    let scrollTimeout;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (editorViewRef.current && onScrollPositionChange) {
          const scrollDOM = editorViewRef.current.scrollDOM;
          onScrollPositionChange(scrollDOM.scrollTop);
        }
      }, 100); // Debounce scroll events
    };

    if (view.scrollDOM) {
      view.scrollDOM.addEventListener('scroll', handleScroll);
    }

    // Initial scroll and selection if provided
    if (scrollToLine !== null && scrollToLine > 0) {
      const lineNum = Math.min(scrollToLine, view.state.doc.lines); // Cap at max lines
      if (lineNum > 0) { // Ensure lineNum is valid
        const line = view.state.doc.line(lineNum);
        if (line) {
          setTimeout(() => {
            if (editorViewRef.current) { // Check if view still exists
              editorViewRef.current.dispatch({
                effects: EditorView.scrollIntoView(line.from, { y: 'center' })
              });
              // Optionally, set selection at the start of the line
              editorViewRef.current.dispatch({ selection: { anchor: line.from } });
            }
          }, 50); // Small delay to ensure editor is fully rendered
        }
      }
    }

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (editorViewRef.current) {
        if (editorViewRef.current.scrollDOM) {
          editorViewRef.current.scrollDOM.removeEventListener('scroll', handleScroll);
        }
        // Remove context menu event listener
        editorViewRef.current.dom.removeEventListener('contextmenu', handleContextMenu);
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]); // Recreate editor only when filePath changes

  // Effect for dynamic updates to editor settings (line numbers, active line, RTL)
  useEffect(() => {
    if (!editorViewRef.current) return;
    editorViewRef.current.dispatch({
      effects: lineNumbersCompartment.reconfigure(showLineNumbers ? lineNumbers() : [])
    });
    editorViewRef.current.dispatch({
      effects: activeLineGutterCompartment.reconfigure(showLineNumbers && enableHighlightActiveLineGutter ? highlightActiveLineGutter() : [])
    });
    editorViewRef.current.dispatch({
      effects: directionCompartment.reconfigure(EditorView.contentAttributes.of({ dir: isRtl ? 'rtl' : 'ltr' }))
    });
  }, [showLineNumbers, enableHighlightActiveLineGutter, isRtl]);

  // Effect for updating content if initialContent prop changes AFTER initial mount
  // This is important if the content is loaded asynchronously or changed externally.
  // IMPORTANT: We preserve the cursor position so that typing doesn't cause the cursor
  // to jump back to the start (which happened when the parent re-rendered with the new
  // value and triggered a full-document replace before the flag was cleared).
  useEffect(() => {
    // If the change came from inside this editor, the doc is already correct — skip.
    if (isInternalChangeRef.current) {
      return;
    }
    if (!editorViewRef.current) return;

    const currentDoc = editorViewRef.current.state.doc.toString();
    // Normalize line endings to LF before comparing — CodeMirror stores LF internally,
    // but files loaded from disk on Windows arrive with CRLF, causing a false mismatch
    // that would mark the file as unsaved the moment it was opened.
    const newDoc = (initialContent || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const normalizedCurrentDoc = currentDoc.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Only dispatch if the content actually differs (avoid no-op updates).
    if (normalizedCurrentDoc !== newDoc) {
      // Save current cursor/selection so we can restore it after the replace.
      const { from, to } = editorViewRef.current.state.selection.main;
      const docLen = newDoc.length;
      // Clamp saved positions to the new document length.
      const newFrom = Math.min(from, docLen);
      const newTo = Math.min(to, docLen);

      editorViewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newDoc },
        // Restore cursor at its previous location (clamped) so typing doesn't jump.
        selection: { anchor: newFrom, head: newTo },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]); // Rerun if initialContent prop itself changes

  // Effect for handling scrollToLine changes after initial mount
  useEffect(() => {
    if (editorViewRef.current && scrollToLine !== null && scrollToLine > 0) {
      const view = editorViewRef.current;
      const lineNum = Math.min(scrollToLine, view.state.doc.lines); // Cap at max lines
      if (lineNum > 0) { // Ensure lineNum is valid
        const line = view.state.doc.line(lineNum);
        setTimeout(() => { // Small delay
          if (editorViewRef.current) { // Check if view still exists
            editorViewRef.current.dispatch({
              effects: EditorView.scrollIntoView(line.from, { y: 'center' })
            });
            editorViewRef.current.dispatch({ selection: { anchor: line.from } }); // Set cursor
          }
        }, 50);
      } else {
        console.warn(`ScrollToLine: Line ${scrollToLine} is out of bounds or invalid (document has ${view.state.doc.lines} lines).`);
      }
    }
  }, [scrollToLine]);

  // Effect for dynamically updating base font size when currentFontSize prop changes
  useEffect(() => {
    if (editorViewRef.current && typeof currentFontSize === 'number' && currentFontSize > 0) {
      editorViewRef.current.dispatch({
        effects: baseThemeCompartment.reconfigure(createBaseTheme(currentFontSize, editorFont, showLineNumbers, isRtl))
      });
    }
  }, [currentFontSize, editorFont, showLineNumbers, isRtl]);


  // Effect for search term highlighting (placeholder, as complex search is handled by search extension)
  useEffect(() => {
    if (editorViewRef.current && searchTermToHighlight) {
      // The `highlightSelectionMatches` extension combined with setting selection
      // from search results in App.jsx usually handles visual highlighting.
      // This effect is more for future direct integration if needed.
      // console.debug("Editor: searchTermToHighlight changed to:", searchTermToHighlight);
    }
  }, [searchTermToHighlight]);

  // Effect to apply annotation decorations
  useEffect(() => {
    if (!editorViewRef.current) return;
    const view = editorViewRef.current;
    const doc = view.state.doc;
    const docLen = doc.length;

    if (!annotations || annotations.length === 0) {
      view.dispatch({ effects: setAnnotationsEffect.of(Decoration.none) });
      return;
    }

    const decoRanges = [];
    for (const ann of annotations) {
      // Try using stored from/to first, then fall back to text search
      let from = ann.from;
      let to = ann.to;
      if (from >= 0 && to > from && to <= docLen) {
        const slice = doc.sliceString(from, to);
        if (slice !== ann.selectedText) {
          // Positions shifted — search for the text near the stored line
          const found = findTextInDoc(doc, ann.selectedText, ann.lineNumber);
          if (found) { from = found.from; to = found.to; }
          else continue;
        }
      } else {
        const found = findTextInDoc(doc, ann.selectedText, ann.lineNumber);
        if (found) { from = found.from; to = found.to; }
        else continue;
      }
      const isSelected = selectedAnnotationId === ann.id;
      const cls = `cm-annotation-${ann.color || 'yellow'}${isSelected ? ' cm-annotation-selected' : ''}`;
      decoRanges.push(Decoration.mark({ class: cls }).range(from, to));
    }

    // Sort by from position (required by RangeSet)
    decoRanges.sort((a, b) => a.from - b.from || a.to - b.to);
    const decoSet = Decoration.set(decoRanges);
    view.dispatch({ effects: setAnnotationsEffect.of(decoSet) });
  }, [annotations, selectedAnnotationId]);


  // Key based on filePath is sufficient now that font size is a prop
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={editorRef} style={{ height: '100%', width: '100%', overflow: 'auto', textAlign: isRtl ? 'right' : 'left' }} />
      <FindReplaceBar
        editorViewRef={editorViewRef}
        isVisible={findReplaceVisible}
        initialMode={findReplaceMode}
        isRtl={isRtl}
        onClose={() => setFindReplaceVisible(false)}
      />
      <SelectedTextContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        selectedText={contextMenu.selectedText}
        onClose={handleContextMenuClose}
        onPilpulta={() => handleSelectedTextAI(onSelectedTextPilpulta)}
        onFindSources={() => handleSelectedTextAI(onSelectedTextFindSources)}
        onFlashcards={() => handleSelectedTextAI(onSelectedTextFlashcards)}
        onSummary={() => handleSelectedTextAI(onSelectedTextSummary)}
        onOrganizeText={() => handleSelectedTextAI(onSelectedTextOrganize)}
        isAnyAiFeatureLoading={isAnyAiFeatureLoading}
        isAnnotationMode={isAnnotationMode}
        onAddAnnotation={onAddAnnotation ? (color) => {
          const view = editorViewRef.current;
          if (!view) return;
          const sel = view.state.selection.main;
          const from = Math.min(sel.from, sel.to);
          const to = Math.max(sel.from, sel.to);
          const lineObj = view.state.doc.lineAt(from);
          onAddAnnotation({
            selectedText: contextMenu.selectedText,
            from,
            to,
            lineNumber: lineObj.number,
            color: color || 'yellow',
          });
        } : undefined}
        onAddBookmark={onAddBookmark ? () => {
          onAddBookmark(contextMenu.selectedText);
        } : undefined}
      />
    </div>
  );
});

export default Editor;

// frontend/src/components/Editor.jsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditorState, Compartment, RangeSetBuilder } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';

import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { DEFAULT_FONT_SIZE_PX } from '../utils/constants';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

let lineNumbersCompartment = new Compartment();
let activeLineGutterCompartment = new Compartment();
let directionCompartment = new Compartment();
let baseThemeCompartment = new Compartment(); // Compartment for base editor styles like font size

// Helper function to create base theme extension
const createBaseTheme = (fontSize, fontFamily) => {
  return EditorView.theme({
    '.cm-content': { // Target the actual content area
      fontSize: `${fontSize}px !important`, // Add !important to ensure override
      fontFamily: fontFamily ? `${fontFamily}, monospace !important` : undefined,
    },
    // Adjust line numbers (gutters) to match the content font size
    '.cm-gutters': {
      fontSize: `${fontSize}px !important`, // Match the content font size
      fontFamily: fontFamily ? `${fontFamily}, monospace !important` : undefined,
    }
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
}, ref) => {
  const editorRef = useRef(null);
  const editorViewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
    // Add access to the CodeMirror view for external manipulation
    getEditorView: () => editorViewRef.current,
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
    const initialBaseTheme = createBaseTheme(currentFontSize || DEFAULT_FONT_SIZE_PX, editorFont);

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

    const extensions = [
      directionCompartment.of(EditorView.contentAttributes.of({dir: isRtl ? 'rtl' : 'ltr'})),
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
      keymap.of([
        ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap,
        ...historyKeymap, ...foldKeymap, ...completionKeymap,
        ...lintKeymap, indentWithTab,
      ]),
      oneDark,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          isInternalChangeRef.current = true;
          onChangeRef.current(update.state.doc.toString());
          setTimeout(() => {
            isInternalChangeRef.current = false;
          }, 0);
        }
      }),
    ];

    if (languageExtension) {
      extensions.push(languageExtension);
    } else {
        // If no specific language, still include some basic features
        extensions.push(highlightSpecialChars());
    }

    const startState = EditorState.create({
      doc: initialContent || '',
      extensions: extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

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
          effects: directionCompartment.reconfigure(EditorView.contentAttributes.of({dir: isRtl ? 'rtl' : 'ltr'}))
      });
  }, [showLineNumbers, enableHighlightActiveLineGutter, isRtl]);

  // Effect for updating content if initialContent prop changes AFTER initial mount
  // This is important if the content is loaded asynchronously or changed externally
  useEffect(() => {
    if (isInternalChangeRef.current) {
      return; // Change originated from this editor, CodeMirror state is already up-to-date
    }
    if (editorViewRef.current && editorViewRef.current.state.doc.toString() !== (initialContent || '')) {
      editorViewRef.current.dispatch({
        changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: initialContent || '' }
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
        effects: baseThemeCompartment.reconfigure(createBaseTheme(currentFontSize, editorFont))
      });
    }
   }, [currentFontSize, editorFont]);


   // Effect for search term highlighting (placeholder, as complex search is handled by search extension)
   useEffect(() => {
       if (editorViewRef.current && searchTermToHighlight) {
           // The `highlightSelectionMatches` extension combined with setting selection
           // from search results in App.jsx usually handles visual highlighting.
           // This effect is more for future direct integration if needed.
           // console.debug("Editor: searchTermToHighlight changed to:", searchTermToHighlight);
       }
   }, [searchTermToHighlight]);


  // Key based on filePath is sufficient now that font size is a prop
  return <div ref={editorRef} style={{ height: '100%', width: '100%', overflow: 'auto', textAlign: isRtl ? 'right' : 'left' }} />;
});

export default Editor;

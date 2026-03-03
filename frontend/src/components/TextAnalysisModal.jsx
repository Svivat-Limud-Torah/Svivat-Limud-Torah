// frontend/src/components/TextAnalysisModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import './TextAnalysisModal.css';

// Initialize mermaid once
let mermaidInitialized = false;

/**
 * Fix common issues in AI-generated Mermaid code.
 * Hebrew text often contains ״ (gershayim) or “” (curly quotes) inside
 * node labels like ["..."], which breaks the Mermaid parser.
 */
function sanitizeMermaidCode(code) {
  if (!code) return code;
  let clean = code.replace(/\r\n/g, '\n');

  // Normalize curly/smart quotes to straight ASCII
  clean = clean
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // curly double → "
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'"); // curly single → '

  // Replace Hebrew gershayim ״ and geresh ׳ with single quote
  clean = clean.replace(/\u05F4/g, "'").replace(/\u05F3/g, "'");

  // Fix " embedded inside Mermaid label strings ["..."], ("..."), {"..."}
  // Non-greedy .*? will find the outermost closing "] via backtracking
  clean = clean.replace(/\["(.*?)"\]/g, (_, inner) => '["' + inner.replace(/"/g, "'") + '"]');
  clean = clean.replace(/\("(.*?)"\)/g, (_, inner) => '("' + inner.replace(/"/g, "'") + '")');
  clean = clean.replace(/\{"(.*?)"\}/g, (_, inner) => '{"' + inner.replace(/"/g, "'") + '"}');

  return clean;
}

const MermaidRenderer = ({ code }) => {
  const containerRef = useRef(null);
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        flowchart: { curve: 'basis', padding: 12 },
        securityLevel: 'strict',
      });
      mermaidInitialized = true;
    }

    const renderDiagram = async () => {
      try {
        setRenderError(null);
        const id = `mermaid-${Date.now()}`;
        const sanitized = sanitizeMermaidCode(code);
        const { svg } = await mermaid.render(id, sanitized);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setRenderError(err.message || 'שגיאה בייצור התרשים');
      }
    };

    renderDiagram();
  }, [code]);

  if (renderError) {
    return (
      <div className="text-analysis__flowchart-error">
        <p>לא ניתן לייצר את התרשים. ייתכן שה-AI יצר קוד לא תקני.</p>
        <pre>{code}</pre>
      </div>
    );
  }

  return <div ref={containerRef} />;
};

const TextAnalysisModal = ({
  isOpen,
  onClose,
  inputText,
  setInputText,
  analysisResult,
  flowchartCode,
  isLoading,
  isLoadingFlowchart,
  error,
  mode,
  onAnalyze,
  onGenerateFlowchart,
  onBackToInput,
  onBackToAnalysis,
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey && inputText.trim()) {
      onAnalyze(inputText);
    }
  };

  return (
    <div className="text-analysis-overlay" onClick={onClose}>
      <div className="text-analysis-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-analysis__header">
          <h2>ניתוח טקסט</h2>
          <button className="text-analysis__close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="text-analysis__body">
          {/* Error */}
          {error && !isLoading && !isLoadingFlowchart && (
            <div className="text-analysis__error">
              <p>שגיאה: {error}</p>
            </div>
          )}

          {/* INPUT MODE */}
          {mode === 'input' && !isLoading && !isLoadingFlowchart && (
            <div className="text-analysis__input-section">
              <p className="text-analysis__label">
                הכנס טקסט לניתוח — גמרא, תוספות, ראשונים או כל מקור תורני:
              </p>
              <textarea
                className="text-analysis__textarea"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="הדבק כאן את הטקסט שברצונך לנתח..."
                autoFocus
              />
              <div className="text-analysis__actions">
                <button
                  className="text-analysis__btn text-analysis__btn--primary"
                  onClick={() => onAnalyze(inputText)}
                  disabled={!inputText.trim()}
                >
                  נתח טקסט
                </button>
                <button
                  className="text-analysis__btn"
                  onClick={onGenerateFlowchart}
                  disabled={!inputText.trim()}
                >
                  תרשים זרימה
                  <span className="text-analysis__paid-notice">(API בתשלום)</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading analysis */}
          {isLoading && (
            <div className="text-analysis__loading">
              <div className="text-analysis__spinner" />
              <span>מנתח את הטקסט...</span>
            </div>
          )}

          {/* Loading flowchart */}
          {isLoadingFlowchart && (
            <div className="text-analysis__loading">
              <div className="text-analysis__spinner" />
              <span>מייצר תרשים זרימה...</span>
            </div>
          )}

          {/* ANALYSIS MODE */}
          {mode === 'analysis' && !isLoading && (
            <>
              <div className="text-analysis__result-toolbar">
                <div className="text-analysis__result-actions">
                  <button className="text-analysis__btn" onClick={onBackToInput}>
                    ← חזור לעריכה
                  </button>
                  <button
                    className="text-analysis__btn"
                    onClick={onGenerateFlowchart}
                    disabled={isLoadingFlowchart}
                  >
                    תרשים זרימה
                    <span className="text-analysis__paid-notice">(API בתשלום)</span>
                  </button>
                </div>
              </div>
              <div className="text-analysis__result-content">
                {analysisResult}
              </div>
            </>
          )}

          {/* FLOWCHART MODE */}
          {mode === 'flowchart' && !isLoadingFlowchart && (
            <>
              <div className="text-analysis__flowchart-toolbar">
                <div className="text-analysis__result-actions">
                  <button className="text-analysis__btn" onClick={onBackToInput}>
                    ← חזור לעריכה
                  </button>
                  {analysisResult && (
                    <button className="text-analysis__btn" onClick={onBackToAnalysis}>
                      חזור לניתוח
                    </button>
                  )}
                  <button
                    className="text-analysis__btn"
                    onClick={onGenerateFlowchart}
                    disabled={isLoadingFlowchart}
                  >
                    ייצר מחדש
                  </button>
                </div>
              </div>
              <div className="text-analysis__flowchart-container">
                {flowchartCode ? (
                  <MermaidRenderer code={flowchartCode} />
                ) : (
                  <p style={{ color: 'var(--theme-text-secondary)' }}>לא נוצר תרשים</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextAnalysisModal;

// frontend/src/components/AnnotationsPanel.jsx
import React, { useState } from 'react';
import { ANNOTATION_COLORS } from '../hooks/useAnnotations';
import './AnnotationsPanel.css';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a855f7', '#ffffff', '#111111',
];

const AnnotationsPanel = ({
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onScrollToAnnotation,
  drawingsHook,
}) => {
  const [activeTab, setActiveTab] = useState('annotations');
  const sorted = [...annotations].sort((a, b) => a.from - b.from);

  return (
    <div className="annotations-panel">
      {/* Tab bar */}
      <div className="annotations-panel-tabs">
        <button
          className={`annotations-tab${activeTab === 'annotations' ? ' active' : ''}`}
          onClick={() => setActiveTab('annotations')}
        >
          הערות{annotations.length > 0 && <span className="annotations-count"> ({annotations.length})</span>}
        </button>
        <button
          className={`annotations-tab${activeTab === 'drawing' ? ' active' : ''}`}
          onClick={() => setActiveTab('drawing')}
        >
          ציור{drawingsHook?.strokes.length > 0 && <span className="annotations-count"> ●</span>}
        </button>
      </div>

      {/* ── Annotations tab ── */}
      {activeTab === 'annotations' && (
        <div className="annotations-list">
          {sorted.length === 0 && (
            <div className="annotations-empty">
              אין הערות עדיין.<br />
              סמן טקסט ולחץ לחיצה ימנית → &ldquo;הוסף הערה&rdquo;
            </div>
          )}
          {sorted.map(ann => {
            const isSelected = selectedAnnotationId === ann.id;
            const colorObj = ANNOTATION_COLORS.find(c => c.id === ann.color) || ANNOTATION_COLORS[0];
            return (
              <div
                key={ann.id}
                className={`annotation-card${isSelected ? ' annotation-card--selected' : ''}`}
                style={{ borderRightColor: colorObj.border }}
                onClick={() => { onSelectAnnotation(ann.id); onScrollToAnnotation(ann); }}
              >
                <div className="annotation-card-header">
                  <div className="annotation-card-text" title={ann.selectedText}>&ldquo;{ann.selectedText}&rdquo;</div>
                  <div className="annotation-card-actions">
                    <button onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }} title="מחק הערה">×</button>
                  </div>
                </div>
                <div className="annotation-color-dots">
                  {ANNOTATION_COLORS.map(c => (
                    <div
                      key={c.id}
                      className={`annotation-color-dot${ann.color === c.id ? ' active' : ''}`}
                      style={{ backgroundColor: c.border }}
                      title={c.label}
                      onClick={(e) => { e.stopPropagation(); onUpdateAnnotation(ann.id, { color: c.id }); }}
                    />
                  ))}
                </div>
                <div className="annotation-note">
                  <textarea
                    value={ann.noteText || ''}
                    onChange={(e) => onUpdateAnnotation(ann.id, { noteText: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="הוסף הערה כאן..."
                    rows={2}
                  />
                </div>
                <div className="annotation-card-line">שורה {ann.lineNumber || '?'}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Drawing tab ── */}
      {activeTab === 'drawing' && drawingsHook && (
        <div className="drawing-tools">
          {/* Tools */}
          <div className="drawing-section-label">כלי ציור</div>
          <div className="drawing-tools-row">
            <button
              className={`drawing-tool-btn${drawingsHook.activeTool === 'pencil' ? ' active' : ''}`}
              onClick={() => drawingsHook.setActiveTool(drawingsHook.activeTool === 'pencil' ? null : 'pencil')}
              title="עיפרון — קו דק וחד">
              עיפרון
            </button>
            <button
              className={`drawing-tool-btn${drawingsHook.activeTool === 'highlighter' ? ' active' : ''}`}
              onClick={() => drawingsHook.setActiveTool(drawingsHook.activeTool === 'highlighter' ? null : 'highlighter')}
              title="טוש — קו עב ושקוף">
              טוש
            </button>
            <button
              className={`drawing-tool-btn${drawingsHook.activeTool === 'eraser' ? ' active' : ''}`}
              onClick={() => drawingsHook.setActiveTool(drawingsHook.activeTool === 'eraser' ? null : 'eraser')}
              title="מחק">
              מחק
            </button>
          </div>

          {/* Color */}
          {drawingsHook.activeTool !== 'eraser' && (
            <>
              <div className="drawing-section-label">צבע</div>
              <div className="drawing-color-row">
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    className={`drawing-color-swatch${drawingsHook.color === c ? ' active' : ''}`}
                    style={{ backgroundColor: c }}
                    title={c}
                    onClick={() => drawingsHook.setColor(c)}
                  />
                ))}
                <input
                  type="color"
                  value={drawingsHook.color}
                  onChange={(e) => drawingsHook.setColor(e.target.value)}
                  className="drawing-color-input"
                  title="צבע מותאם אישי"
                />
              </div>
            </>
          )}

          {/* Width */}
          <div className="drawing-section-label">
            עובי: <strong>{drawingsHook.lineWidth}px</strong>
          </div>
          <input
            type="range"
            min={drawingsHook.activeTool === 'highlighter' ? 8 : 1}
            max={drawingsHook.activeTool === 'highlighter' ? 40 : drawingsHook.activeTool === 'eraser' ? 50 : 20}
            value={drawingsHook.lineWidth}
            onChange={(e) => drawingsHook.setLineWidth(Number(e.target.value))}
            className="drawing-width-slider"
          />

          {/* Actions */}
          <div className="drawing-actions">
            <button
              className="drawing-action-btn"
              onClick={drawingsHook.undoLast}
              disabled={drawingsHook.strokes.length === 0}
              title="בטל קו אחרון">
              ↩ ביטול
            </button>
            <button
              className="drawing-action-btn danger"
              onClick={drawingsHook.clearAll}
              disabled={drawingsHook.strokes.length === 0}
              title="נקה את כל הציורים">
              נקה הכל
            </button>
          </div>

          {/* Status */}
          {drawingsHook.activeTool ? (
            <div
              className="drawing-status active clickable"
              onClick={() => drawingsHook.setActiveTool(null)}
              title="לחץ לכיבוי מצב ציור"
            >
              מצב ציור פעיל — לחץ כאן לכיבוי
            </div>
          ) : (
            <div className="drawing-status">
              בחר כלי כדי להתחיל לצייר
            </div>
          )}
          {drawingsHook.strokes.length > 0 && (
            <div className="drawing-saved-note">
              ✓ {drawingsHook.strokes.length} קוים נשמרו אוטומטית
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnotationsPanel;

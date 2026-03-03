// frontend/src/components/StatusBar.jsx
import React, { useMemo } from 'react';
import './StatusBar.css';

const formatModelName = (model) => {
  if (!model) return '';
  return model
    .replace(/^models\//, '')
    .replace(/gemini-/i, 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
};

const StatusBar = ({ line, col, content, fileName, aiModel, isDirty, isAutoSaving }) => {
  const wordCount = useMemo(() => {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const fileExt = useMemo(() => {
    if (!fileName) return '';
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'TXT';
  }, [fileName]);

  return (
    <div className="status-bar" dir="ltr">
      <div className="status-bar__section">
        <span className="status-bar__item status-bar__cursor">{line}:{col}</span>
        <span className="status-bar__divider" />
        <span className="status-bar__item">{wordCount} מילים</span>
        <span className="status-bar__divider" />
        <span className="status-bar__item status-bar__filetype">{fileExt}</span>
      </div>
      <div className="status-bar__section">
        <span className="status-bar__item status-bar__model" title={aiModel}>{formatModelName(aiModel)}</span>
        <span className="status-bar__divider" />
        <span className={`status-bar__item status-bar__save ${
          isAutoSaving
            ? 'status-bar__save--saving'
            : isDirty
              ? 'status-bar__save--dirty'
              : 'status-bar__save--clean'
        }`}>
          {isAutoSaving ? '⟳ שומר...' : isDirty ? '● לא שמור' : '✓ שמור'}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;

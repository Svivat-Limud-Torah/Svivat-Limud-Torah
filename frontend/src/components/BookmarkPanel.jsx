// frontend/src/components/BookmarkPanel.jsx
import React, { useState, useCallback, useRef } from 'react';
import './BookmarkPanel.css';

const BookmarkCard = ({ bookmark, onDelete, onTogglePin, onUpdate, onNavigate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editLabel, setEditLabel] = useState(bookmark.label || '');
  const inputRef = useRef(null);

  const handleLabelSubmit = () => {
    const trimmed = editLabel.trim();
    onUpdate(bookmark.id, { label: trimmed });
    setIsEditing(false);
  };

  const handleLabelKeyDown = (e) => {
    if (e.key === 'Enter') handleLabelSubmit();
    if (e.key === 'Escape') {
      setEditLabel(bookmark.label || '');
      setIsEditing(false);
    }
  };

  const startEditing = () => {
    setEditLabel(bookmark.label || '');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const textOverflows = bookmark.text.split('\n').length > 3 || bookmark.text.length > 200;

  return (
    <div className={`bookmark-card ${bookmark.pinned ? 'bookmark-card--pinned' : ''}`}>
      <div className="bookmark-card__header">
        <span
          className="bookmark-card__source"
          title={bookmark.sourceFileName || 'מקור לא ידוע'}
          style={{ cursor: bookmark.sourceFileId ? 'pointer' : 'default' }}
          onClick={() => bookmark.sourceFileId && onNavigate?.(bookmark.sourceFileId)}
        >
          {bookmark.sourceFileName || 'מקור לא ידוע'}
        </span>
        <div className="bookmark-card__actions" style={{ opacity: bookmark.pinned ? 1 : undefined }}>
          <button
            className={`bookmark-card__action-btn bookmark-card__action-btn--pin ${bookmark.pinned ? 'bookmark-card__action-btn--pin-active' : ''}`}
            onClick={() => onTogglePin(bookmark.id)}
            title={bookmark.pinned ? 'בטל הצמדה' : 'הצמד'}
          >
            {bookmark.pinned ? '◆' : '◇'}
          </button>
          <button
            className="bookmark-card__action-btn"
            onClick={startEditing}
            title="ערוך תווית"
          >
            ✎
          </button>
          <button
            className="bookmark-card__action-btn bookmark-card__action-btn--delete"
            onClick={() => onDelete(bookmark.id)}
            title="מחק סימניה"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Label */}
      {isEditing ? (
        <input
          ref={inputRef}
          className="bookmark-card__label-input"
          value={editLabel}
          onChange={e => setEditLabel(e.target.value)}
          onBlur={handleLabelSubmit}
          onKeyDown={handleLabelKeyDown}
          placeholder="תווית (אופציונלי)..."
          maxLength={80}
        />
      ) : (
        bookmark.label && <div className="bookmark-card__label" onClick={startEditing}>{bookmark.label}</div>
      )}

      {/* Text excerpt */}
      <div className={`bookmark-card__text ${expanded ? 'bookmark-card__text--expanded' : ''}`}>
        {bookmark.text}
        {!expanded && textOverflows && <div className="bookmark-card__text-fade" />}
      </div>
      {textOverflows && (
        <button className="bookmark-card__expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'הצג פחות ▲' : 'הצג עוד ▼'}
        </button>
      )}
    </div>
  );
};


const BookmarkPanel = ({
  bookmarks = [],
  onDelete,
  onTogglePin,
  onUpdate,
  onClose,
  onNavigateToFile,
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'pinned'
  const [panelHeight, setPanelHeight] = useState(220);
  const dragRef = useRef(null);

  const filtered = filter === 'pinned' ? bookmarks.filter(b => b.pinned) : bookmarks;
  const pinnedCount = bookmarks.filter(b => b.pinned).length;

  // Panel resize drag
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panelHeight;
    const onMove = (ev) => {
      const delta = startY - ev.clientY;
      setPanelHeight(Math.max(120, Math.min(startH + delta, window.innerHeight * 0.6)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelHeight]);

  return (
    <div className="bookmark-panel" style={{ height: panelHeight }}>
      <div className="bookmark-panel__resize-handle" onMouseDown={handleDragStart} ref={dragRef} />
      <div className="bookmark-panel__header">
        <div className="bookmark-panel__title">
          סימניות
          <span className="bookmark-panel__count">({bookmarks.length})</span>
        </div>
        <div className="bookmark-panel__header-actions">
          <button className="bookmark-panel__header-btn" onClick={onClose} title="סגור פאנל סימניות">✕</button>
        </div>
      </div>

      <div className="bookmark-panel__filters">
        <button
          className={`bookmark-panel__filter-btn ${filter === 'all' ? 'bookmark-panel__filter-btn--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          הכל ({bookmarks.length})
        </button>
        <button
          className={`bookmark-panel__filter-btn ${filter === 'pinned' ? 'bookmark-panel__filter-btn--active' : ''}`}
          onClick={() => setFilter('pinned')}
        >
          מוצמדות ({pinnedCount})
        </button>
      </div>

      <div className="bookmark-panel__cards">
        {filtered.length === 0 ? (
          <div className="bookmark-panel__empty">
            <span>{filter === 'pinned' ? 'אין סימניות מוצמדות' : 'אין סימניות שמורות'}</span>
            <span className="bookmark-panel__empty-hint">
              סמן טקסט בעורך ← לחץ Right-Click ← "שמור כסימניה"
            </span>
          </div>
        ) : (
          filtered.map(b => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onUpdate={onUpdate}
              onNavigate={onNavigateToFile}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BookmarkPanel;

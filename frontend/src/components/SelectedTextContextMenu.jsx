// frontend/src/components/SelectedTextContextMenu.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './SelectedTextContextMenu.css';
import { HEBREW_TEXT } from '../utils/constants';
import { ANNOTATION_COLORS } from '../hooks/useAnnotations';

const SelectedTextContextMenu = ({ 
  isVisible, 
  position, 
  selectedText,
  onClose,
  onPilpulta,
  onFindSources,
  onFlashcards,
  onSummary,
  isAnyAiFeatureLoading,
  isAnnotationMode,
  onAddAnnotation,
  onAddBookmark,
}) => {
  const menuRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pos, setPos] = useState({ top: position?.y ?? 0, left: position?.x ?? 0, opacity: 0 });

  // After render, measure and clamp to keep fully on-screen
  useLayoutEffect(() => {
    if (!isVisible || !menuRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = menuRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 6;

    let left = position.x;
    let top = position.y;

    if (left + w + MARGIN > vw) left = Math.max(MARGIN, position.x - w);
    if (left < MARGIN) left = MARGIN;
    if (top + h + MARGIN > vh) top = Math.max(MARGIN, position.y - h);
    if (top < MARGIN) top = MARGIN;

    setPos({ top, left, opacity: 1 });
  }, [isVisible, position]);

  // Reset opacity when menu is hidden so next open starts invisible
  useEffect(() => {
    if (!isVisible) setPos(p => ({ ...p, opacity: 0 }));
    else setShowColorPicker(false);
  }, [isVisible]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (!isVisible || !selectedText) {
    return null;
  }

  const truncatedText = selectedText.length > 50 
    ? selectedText.substring(0, 50) + '...' 
    : selectedText;

  const menuItems = [
    {
      label: HEBREW_TEXT.generatePilpultaButton || 'פלפולתא',
      icon: '',
      action: onPilpulta,
      tooltip: 'צור קושיות מהטקסט הנבחר'
    },
    {
      label: HEBREW_TEXT.findSources || 'מצא מקורות',
      icon: '',
      action: onFindSources,
      tooltip: 'מצא מקורות יהודיים לטקסט הנבחר'
    },
    {
      label: HEBREW_TEXT.generateFlashcards || 'כרטיסיות שו"ת',
      icon: '',
      action: onFlashcards,
      tooltip: 'צור כרטיסיות לימוד מהטקסט הנבחר'
    },
    {
      label: HEBREW_TEXT.generateSummary || 'סכם טקסט',
      icon: '',
      action: onSummary,
      tooltip: 'צור סיכום מהטקסט הנבחר'
    }
  ];

  return (
    <div 
      className="selected-text-context-menu"
      ref={menuRef}
      style={{
        left: pos.left,
        top: pos.top,
        opacity: pos.opacity,
      }}
    >
      <div className="selected-text-info">
        <div>טקסט נבחר:</div>
        <div className="selected-text-preview" title={selectedText}>
          "{truncatedText}"
        </div>
      </div>
      
      {menuItems.map((item, index) => (
        <button
          key={index}
          className="selected-text-context-menu-item"
          onClick={() => {
            item.action();
            onClose();
          }}
          disabled={isAnyAiFeatureLoading}
          title={item.tooltip}
        >
          <span className="icon">{item.icon}</span>
          {item.label}
        </button>
      ))}

      {/* Bookmark section */}
      {onAddBookmark && (
        <>
          <div style={{ height: '1px', background: 'var(--theme-border-color)', margin: '4px 0' }} />
          <button
            className="selected-text-context-menu-item"
            onClick={() => {
              onAddBookmark();
              onClose();
            }}
            title="שמור את הטקסט הנבחר כסימניה"
          >
            <span className="icon"></span>
            שמור כסימניה
          </button>
        </>
      )}

      {/* Annotation section */}
      {isAnnotationMode && onAddAnnotation && (
        <>
          <div style={{ height: '1px', background: 'var(--theme-border-color)', margin: '4px 0' }} />
          {!showColorPicker ? (
            <button
              className="selected-text-context-menu-item"
              onClick={() => setShowColorPicker(true)}
              title="הוסף הערת שוליים לטקסט הנבחר"
            >
              <span className="icon"></span>
              הוסף הערה
            </button>
          ) : (
            <div style={{ padding: '6px 10px' }}>
              <div style={{ fontSize: '0.8em', color: 'var(--theme-text-secondary)', marginBottom: '5px' }}>בחר צבע:</div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                {ANNOTATION_COLORS.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onAddAnnotation(c.id);
                      setShowColorPicker(false);
                      onClose();
                    }}
                    title={c.label}
                    style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      backgroundColor: c.border, cursor: 'pointer',
                      border: '2px solid transparent',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SelectedTextContextMenu;

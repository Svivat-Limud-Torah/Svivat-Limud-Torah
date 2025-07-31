// frontend/src/components/SelectedTextContextMenu.jsx
import React, { useEffect, useRef } from 'react';
import './SelectedTextContextMenu.css';
import { HEBREW_TEXT } from '../utils/constants';

const SelectedTextContextMenu = ({ 
  isVisible, 
  position, 
  selectedText,
  onClose,
  onPilpulta,
  onFindSources,
  onFlashcards,
  onSummary,
  isAnyAiFeatureLoading
}) => {
  const menuRef = useRef(null);

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

  // Calculate menu position to ensure it stays within viewport
  const adjustedPosition = { ...position };
  if (menuRef.current) {
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (position.x + 220 > viewportWidth) {
      adjustedPosition.x = viewportWidth - 230;
    }

    // Adjust vertical position  
    if (position.y + 300 > viewportHeight) {
      adjustedPosition.y = Math.max(10, position.y - 300);
    }
  }

  const truncatedText = selectedText.length > 50 
    ? selectedText.substring(0, 50) + '...' 
    : selectedText;

  const menuItems = [
    {
      label: HEBREW_TEXT.generatePilpultaButton || 'פלפולתא',
      icon: '🤔',
      action: onPilpulta,
      tooltip: 'צור קושיות מהטקסט הנבחר'
    },
    {
      label: HEBREW_TEXT.findSources || 'מצא מקורות',
      icon: '📖',
      action: onFindSources,
      tooltip: 'מצא מקורות יהודיים לטקסט הנבחר'
    },
    {
      label: HEBREW_TEXT.generateFlashcards || 'כרטיסיות שו"ת',
      icon: '📚',
      action: onFlashcards,
      tooltip: 'צור כרטיסיות לימוד מהטקסט הנבחר'
    },
    {
      label: HEBREW_TEXT.generateSummary || 'סכם טקסט',
      icon: '📝',
      action: onSummary,
      tooltip: 'צור סיכום מהטקסט הנבחר'
    }
  ];

  return (
    <div 
      className="selected-text-context-menu"
      ref={menuRef}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
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
    </div>
  );
};

export default SelectedTextContextMenu;

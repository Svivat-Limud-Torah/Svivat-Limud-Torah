// frontend/src/components/QuestionnaireButton.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants'; 

const QuestionnaireButton = ({ onClick, disabled, notificationActive }) => {
  // Removed inline style definitions except for notificationDotStyle

  const notificationDotStyle = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '10px',
    height: '10px',
    backgroundColor: '#ef4444', // Red dot
    borderRadius: '50%',
    border: '1px solid white',
    boxSizing: 'border-box',
  };

  // Removed hover/leave handlers

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn" // Added btn class
      style={{ position: 'relative' }} // Keep position relative for the dot
      // Removed other inline styles and hover handlers
      title={HEBREW_TEXT.questionnaire?.buttonTitle || "פתח שאלון יומי"}
    >
      {HEBREW_TEXT.questionnaire?.buttonText || "שאלון"}
      {notificationActive && !disabled && <span style={notificationDotStyle}></span>}
    </button>
  );
};

export default QuestionnaireButton;

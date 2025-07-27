// frontend/src/components/LearningGraphButton.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants';

const LearningGraphButton = ({ onClick, disabled }) => {
  // Removed inline style definitions

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn" // Added btn class
      // Removed inline style and hover handlers
      title={HEBREW_TEXT.learningGraph?.buttonTitle || "הצג גרף התקדמות בלימוד"}
    >
      {HEBREW_TEXT.learningGraph?.buttonText || "גרף לימוד"}
    </button>
  );
};

export default LearningGraphButton;

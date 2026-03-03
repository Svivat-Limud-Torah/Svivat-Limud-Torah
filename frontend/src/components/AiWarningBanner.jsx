// frontend/src/components/AiWarningBanner.jsx
import React, { useState } from 'react';
import './AiWarningBanner.css';

const AiWarningBanner = () => {
  const [isVisible, setIsVisible] = useState(true); // Always start visible

  const handleDismiss = () => {
    setIsVisible(false);
    // No persistent storage - banner will always reappear on app restart
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="ai-warning-banner">
      <div className="ai-warning-content">
        <strong>המידע הניתן על ידי הבינה המלאכותית יכול להיות מוטעה. אנא בדקו את המקורות והתוכן.</strong>
      </div>
      <button 
        className="ai-warning-close" 
        onClick={handleDismiss}
        title="סגור הודעה זו"
        aria-label="סגור הודעה"
      >
        ×
      </button>
    </div>
  );
};

export default AiWarningBanner;

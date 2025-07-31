// frontend/src/components/QuotaLimitModal.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './QuotaLimitModal.css';

const QuotaLimitModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="quota-limit-modal-backdrop" onClick={handleBackdropClick}>
      <div className="quota-limit-modal">
        <div className="quota-limit-header">
          <h2 className="quota-limit-title">⚠️ {HEBREW_TEXT.quotaLimitReachedTitle}</h2>
          <button 
            className="quota-limit-close-btn" 
            onClick={handleClose}
            aria-label="סגור"
          >
            ×
          </button>
        </div>
        
        <div className="quota-limit-content">
          <p className="quota-limit-message">
            {HEBREW_TEXT.quotaLimitReachedMessage}
          </p>
          
          <div className="quota-limit-advice">
            <h3>{HEBREW_TEXT.quotaLimitReachedAdvice}</h3>
            <ul className="quota-limit-tips">
              <li>{HEBREW_TEXT.quotaLimitTip1}</li>
              <li>{HEBREW_TEXT.quotaLimitTip2}</li>
              <li>{HEBREW_TEXT.quotaLimitTip3}</li>
              <li>{HEBREW_TEXT.quotaLimitTip4}</li>
            </ul>
          </div>
        </div>
        
        <div className="quota-limit-footer">
          <button 
            className="btn btn-primary quota-limit-btn"
            onClick={handleClose}
          >
            {HEBREW_TEXT.quotaLimitCloseButton}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotaLimitModal;

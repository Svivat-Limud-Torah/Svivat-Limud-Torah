// frontend/src/components/ModelOverloadedModal.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './ModelOverloadedModal.css';

const ModelOverloadedModal = ({ isOpen, onClose }) => {
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
    <div className="model-overloaded-modal-backdrop" onClick={handleBackdropClick}>
      <div className="model-overloaded-modal">
        <div className="model-overloaded-header">
          <h2 className="model-overloaded-title">🔄 {HEBREW_TEXT.modelOverloadedTitle}</h2>
          <button 
            className="model-overloaded-close-btn" 
            onClick={handleClose}
            aria-label="סגור"
          >
            ×
          </button>
        </div>
        
        <div className="model-overloaded-content">
          <p className="model-overloaded-message">
            {HEBREW_TEXT.modelOverloadedMessage}
          </p>
          
          <div className="model-overloaded-advice">
            <h3>{HEBREW_TEXT.modelOverloadedAdvice}</h3>
            <ul className="model-overloaded-tips">
              <li>{HEBREW_TEXT.modelOverloadedTip1}</li>
              <li>{HEBREW_TEXT.modelOverloadedTip2}</li>
              <li>{HEBREW_TEXT.modelOverloadedTip3}</li>
            </ul>
          </div>
        </div>
        
        <div className="model-overloaded-footer">
          <button 
            className="btn btn-primary model-overloaded-btn"
            onClick={handleClose}
          >
            {HEBREW_TEXT.modelOverloadedCloseButton}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelOverloadedModal;

// frontend/src/components/ModelOverloadedModal.jsx
import React from 'react';
import { HEBREW_TEXT, AI_MODELS_FREE } from '../utils/constants';
import './ModelOverloadedModal.css';

const SWITCH_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'מהיר ויעיל' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', desc: 'הכי מהיר וקל' },
];

const ModelOverloadedModal = ({ isOpen, onClose, currentModel, onSwitchModel }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const handleSwitchModel = (modelValue) => {
    if (onSwitchModel) onSwitchModel(modelValue);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const alternativeModels = SWITCH_MODELS.filter(m => m.value !== currentModel);

  return (
    <div className="model-overloaded-modal-backdrop" onClick={handleBackdropClick}>
      <div className="model-overloaded-modal">
        <div className="model-overloaded-header">
          <h2 className="model-overloaded-title">⚡ {HEBREW_TEXT.modelOverloadedTitle}</h2>
          <button 
            className="model-overloaded-close-btn" 
            onClick={handleClose}
            aria-label="סגור"
          >
            ×
          </button>
        </div>
        
        <div className="model-overloaded-content">
          {currentModel && (
            <div className="model-overloaded-current">
              <span className="model-overloaded-current-label">{HEBREW_TEXT.modelOverloadedCurrentModel}</span>
              <span className="model-overloaded-current-name">{currentModel}</span>
            </div>
          )}

          <p className="model-overloaded-message">
            {HEBREW_TEXT.modelOverloadedMessage}
          </p>

          {alternativeModels.length > 0 && (
            <div className="model-overloaded-switch-section">
              <h3 className="model-overloaded-switch-title">
                🔄 {HEBREW_TEXT.modelOverloadedSwitchTitle}
              </h3>
              <p className="model-overloaded-switch-desc">{HEBREW_TEXT.modelOverloadedSwitchDesc}</p>
              <div className="model-overloaded-switch-buttons">
                {alternativeModels.map(m => (
                  <button
                    key={m.value}
                    className="btn btn-primary model-overloaded-switch-btn"
                    onClick={() => handleSwitchModel(m.value)}
                  >
                    <span className="switch-btn-label">{HEBREW_TEXT.modelOverloadedSwitchButtonPrefix}{m.label}</span>
                    <span className="switch-btn-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
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
            className="btn model-overloaded-btn"
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

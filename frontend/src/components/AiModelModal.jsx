import React, { useState } from 'react';
import './AiModelModal.css';
import { HEBREW_TEXT } from '../utils/constants'; // Assuming constants file exists

const AiModelModal = ({ isOpen, onClose, models, selectedModel, onSelectModel, onAddCustomModel }) => {
  const [customModelName, setCustomModelName] = useState('');
  
  if (!isOpen) return null;

  const handleAddCustomModel = () => {
    if (customModelName.trim()) {
      onAddCustomModel(customModelName.trim());
      setCustomModelName('');
    }
  };

  return (
    <div className="ai-model-modal-overlay" onClick={onClose}>
      <div className="ai-model-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{HEBREW_TEXT.selectAiModelTitle || "בחר מודל בינה מלאכותית"}</h2>
        <div className="ai-model-list">
          {models.map((model) => (
            <button
              key={model}
              className={`ai-model-option ${selectedModel === model ? 'selected' : ''}`}
              onClick={() => {
                onSelectModel(model);
                onClose(); // Close modal after selection
              }}
            >
              {model}
            </button>
          ))}
        </div>
        <div className="custom-model-input">
          <input
            type="text"
            placeholder={HEBREW_TEXT.customModelPlaceholder || "הזן שם מודל מותאם אישית"}
            value={customModelName}
            onChange={(e) => setCustomModelName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomModel()}
          />
          <button 
            className="btn btn-primary"
            onClick={handleAddCustomModel}
            disabled={!customModelName.trim()}
          >
            {HEBREW_TEXT.addCustomModel || "הוסף מודל"}
          </button>
        </div>
        <button className="btn btn-secondary ai-model-close-btn" onClick={onClose}>
          {HEBREW_TEXT.close || "סגור"}
        </button>
      </div>
    </div>
  );
};

export default AiModelModal;

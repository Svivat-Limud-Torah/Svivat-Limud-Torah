import React, { useState } from 'react';
import './AiModelModal.css';
import { HEBREW_TEXT, AI_MODELS_FREE, AI_MODELS_PAID, API_KEY_IS_PAID_STORAGE_KEY } from '../utils/constants';

const AiModelModal = ({ isOpen, onClose, models, freeModels = [], paidModels = [], selectedModel, onSelectModel, onAddCustomModel }) => {
  const [customModelName, setCustomModelName] = useState('');
  const [showPaidInfo, setShowPaidInfo] = useState(false);
  
  if (!isOpen) return null;

  const isPaidKey = localStorage.getItem(API_KEY_IS_PAID_STORAGE_KEY) === 'true';
  const customModels = models.filter(m => !freeModels.includes(m) && !paidModels.includes(m));

  // Get description for a model
  const getModelInfo = (modelValue) => {
    return AI_MODELS_FREE.find(m => m.value === modelValue) || 
           AI_MODELS_PAID.find(m => m.value === modelValue) || 
           null;
  };

  const handleAddCustomModel = () => {
    if (customModelName.trim()) {
      onAddCustomModel(customModelName.trim());
      setCustomModelName('');
    }
  };

  const handleTogglePaidKey = () => {
    const newValue = !isPaidKey;
    localStorage.setItem(API_KEY_IS_PAID_STORAGE_KEY, newValue ? 'true' : 'false');
    // Force re-render
    window.dispatchEvent(new Event('storage'));
  };

  const openExternalLink = (url) => {
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="ai-model-modal-overlay" onClick={onClose}>
      <div className="ai-model-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{HEBREW_TEXT.selectAiModelTitle || "בחר מודל בינה מלאכותית"}</h2>
        
        {/* Free Models Section */}
        <div className="ai-model-section">
          <h3 className="ai-model-section-title free-title">מודלים מהירים (חינמיים)</h3>
          <p className="ai-model-section-desc">מתאימים למשימות פשוטות ותגובות מהירות — עובדים עם כל מפתח API</p>
          <div className="ai-model-list">
            {freeModels.map((model) => {
              const info = getModelInfo(model);
              return (
                <button
                  key={model}
                  className={`ai-model-option ${selectedModel === model ? 'selected' : ''}`}
                  onClick={() => { onSelectModel(model); onClose(); }}
                >
                  <span className="model-name">{info?.label || model}</span>
                  {info?.description && <span className="model-desc">{info.description}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paid Models Section */}
        <div className="ai-model-section paid-section">
          <h3 className="ai-model-section-title paid-title">מודלים חכמים (בתשלום)</h3>
          <p className="ai-model-section-desc">מעולים למשימות מורכבות, מציאת מקורות וניתוח מעמיק — דורשים מפתח עם חיוב</p>
          <div className="ai-model-list">
            {paidModels.map((model) => {
              const info = getModelInfo(model);
              return (
                <button
                  key={model}
                  className={`ai-model-option paid-model ${selectedModel === model ? 'selected' : ''} ${!isPaidKey ? 'locked' : ''}`}
                  onClick={() => {
                    if (!isPaidKey) {
                      setShowPaidInfo(true);
                      return;
                    }
                    onSelectModel(model);
                    onClose();
                  }}
                >
                  <span className="model-name">
                    {!isPaidKey && '* '}{info?.label || model}
                  </span>
                  {info?.description && <span className="model-desc">{info.description}</span>}
                </button>
              );
            })}
          </div>

          {/* Paid Key Toggle */}
          <div className="paid-key-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isPaidKey}
                onChange={handleTogglePaidKey}
              />
              <span>יש לי מפתח API בתשלום</span>
            </label>
          </div>

          {/* Paid Info / Instructions */}
          <button
            className="paid-info-toggle-btn"
            onClick={() => setShowPaidInfo(!showPaidInfo)}
          >
            {showPaidInfo ? 'הסתר הוראות' : 'איך משיגים מפתח בתשלום?'}
          </button>
          
          {showPaidInfo && (
            <div className="paid-info-content">
              <h4>איך להפעיל מפתח API בתשלום:</h4>
              <ol className="paid-instructions-list">
                <li>
                  היכנסו ל-
                  <a href="#" onClick={(e) => { e.preventDefault(); openExternalLink('https://aistudio.google.com/apikey'); }} className="paid-link">
                    Google AI Studio — API Keys
                  </a>
                </li>
                <li>לחצו על המפתח שלכם</li>
                <li>בתחתית העמוד תראו אפשרות <strong>"Upgrade to Paid"</strong></li>
                <li>הפעילו חיוב (Billing) עם כרטיס אשראי בחשבון Google Cloud</li>
                <li>אחרי ההפעלה — סמנו למעלה "יש לי מפתח API בתשלום"</li>
              </ol>
              <div className="paid-info-note">
                <strong>טיפ:</strong> גם עם מפתח בתשלום, התשלום הוא לפי שימוש בלבד.
                אם תשתמשו מעט — התשלום יהיה זניח (סנטים בודדים).
                <br />
                <strong>תמחור לדוגמא:</strong> Gemini 3.1 Pro — $2 לכל מיליון טוקנים קלט, $12 פלט.
                <br />
                <a href="#" onClick={(e) => { e.preventDefault(); openExternalLink('https://ai.google.dev/gemini-api/docs/pricing'); }} className="paid-link">
                  לטבלת תמחור מלאה →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Custom Models Section */}
        {customModels.length > 0 && (
          <div className="ai-model-section">
            <h3 className="ai-model-section-title custom-title">מודלים מותאמים אישית</h3>
            <div className="ai-model-list">
              {customModels.map((model) => (
                <button
                  key={model}
                  className={`ai-model-option ${selectedModel === model ? 'selected' : ''}`}
                  onClick={() => { onSelectModel(model); onClose(); }}
                >
                  <span className="model-name">{model}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

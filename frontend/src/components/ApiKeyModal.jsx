import React, { useState, useEffect } from 'react';
import './ApiKeyModal.css';
import { HEBREW_TEXT } from '../utils/constants';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

function ApiKeyModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
      setApiKey(storedKey);
      setSavedMessage(''); // Clear message when opening
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    setSavedMessage(HEBREW_TEXT.geminiApiKeySaved);
    // Optionally close the modal after saving, or let the user close it
    // onClose();
  };

  const handleInputChange = (event) => {
    setApiKey(event.target.value);
    if (savedMessage) {
      setSavedMessage(''); // Clear saved message on input change
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="api-key-modal-overlay" onClick={onClose}>
      <div className="api-key-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{HEBREW_TEXT.geminiApiKeyModalTitle}</h2>
        <p>
          הדבק כאן את מפתח ה-API שלך עבור Google Gemini כדי להפעיל תכונות AI.
          ניתן להשיג מפתח בחינם דרך
          <a href="https://ai.google.com/studio" target="_blank" rel="noopener noreferrer"> Google AI Studio</a>.
          
        </p>
        
        <div className="instructions-section">
          <button 
            type="button"
            className="instructions-toggle-btn"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? 'הסתר הוראות' : 'מדריך צעד אחר צעד'}
          </button>
          
          {showInstructions && (
            <div className="instructions-content">
              <h3>איך להשיג מפתח API של Google Gemini:</h3>
              <ol className="instructions-list">
                <li>חפשו בגוגל "Google AI Studio" וכנסו לאפשרות הראשונה</li>
                <li>היכנסו עם חשבון הגוגל שלכם</li>
                <li>ודאו שאתם בתוך צ'אט בוט</li>
                <li>בחלק העליון של המסך תראו כפתור שכתוב עליו "Get API Key" - לחצו עליו</li>
                <li>לחצו על "Create API Key"</li>
                <li>צרו את המפתח והעתיקו את המפתח החדש שקיבלתם</li>
                <li>הדביקו את המפתח בשדה למטה</li>
              </ol>

            </div>
          )}
        </div>
        <input
          type="password" // Use password type to obscure the key
          value={apiKey}
          onChange={handleInputChange}
          placeholder={HEBREW_TEXT.enterGeminiApiKey}
          className="api-key-input"
        />
        <div className="api-key-modal-actions">
          <button onClick={handleSave} className="btn btn-primary">
            {HEBREW_TEXT.saveApiKey}
          </button>
          <button onClick={onClose} className="btn">
            {HEBREW_TEXT.close}
          </button>
        </div>
        {savedMessage && <p className="api-key-saved-message">{savedMessage}</p>}
      </div>
    </div>
  );
}

// Helper function to get the key details, can be imported elsewhere
export const getApiKeyDetails = () => {
    const key = localStorage.getItem(API_KEY_STORAGE_KEY);
    return { key };
};


export default ApiKeyModal;

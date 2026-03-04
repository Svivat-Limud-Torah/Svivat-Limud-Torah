import React, { useState, useEffect } from 'react';
import './ApiKeyModal.css';
import { HEBREW_TEXT } from '../utils/constants';
import { setApiKey as sendApiKeyToServer, getApiKeyStatus } from '../utils/aiProxy';

const HAS_KEY_FLAG = 'gemini_has_key';
const IS_PAID_FLAG = 'gemini_api_key_is_paid';
const STORED_KEY = 'gemini_api_key_val';

function ApiKeyModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const hasKey = localStorage.getItem(HAS_KEY_FLAG) === 'true';
      setApiKey(hasKey ? '••••••••••••••••' : '');
      setSavedMessage('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!apiKey.trim() || apiKey.startsWith('••')) {
      return;
    }
    try {
      const isPaid = localStorage.getItem(IS_PAID_FLAG) === 'true';
      await sendApiKeyToServer(apiKey.trim(), isPaid);
      localStorage.setItem(HAS_KEY_FLAG, 'true');
      localStorage.setItem(STORED_KEY, apiKey.trim());
      setSavedMessage(HEBREW_TEXT.geminiApiKeySaved);
    } catch (err) {
      setSavedMessage('שגיאה בשמירת המפתח: ' + err.message);
    }
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

        {/* Video tutorial banner */}
        <div className="api-key-video-banner">
          <span className="api-key-video-icon">🎬</span>
          <div className="api-key-video-text">
            <strong>לא יודע מאיפה מתחילים?</strong>
            <span> צפה בסרטון הדרכה קצר שמסביר צעד אחר צעד איך להשיג מפתח API חינמי.</span>
          </div>
          <button
            type="button"
            className="api-key-video-btn"
            onClick={() => {
              const url = 'https://youtu.be/07R4L3iUikk';
              if (window.electronAPI && window.electronAPI.openExternal) {
                window.electronAPI.openExternal(url);
              } else {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            ▶ צפה בסרטון
          </button>
        </div>

        <p>
          הדבק כאן את מפתח ה-API שלך עבור Google Gemini כדי להפעיל תכונות AI.
          המפתח נשמר אצלך בלבד ואינו נשלח לאף שרת חיצוני.
        </p>

        <div className="instructions-section">
          <button
            type="button"
            className="instructions-toggle-btn"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? 'הסתר הסבר' : 'איך מקבלים מפתח API?'}
          </button>

          {showInstructions && (
            <div className="instructions-content">

              <h3>אפשרות א׳ — מפתח חינמי (Google AI Studio)</h3>
              <p style={{ marginBottom: '8px', color: 'var(--theme-text-secondary)' }}>
                גוגל מאפשרת קבלת מפתח חינמי עם מכסת שימוש מוגבלת — מתאים לשימוש יומיומי רגיל.
              </p>
              <ol className="instructions-list">
                <li>
                  כנסו ל-
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (window.electronAPI && window.electronAPI.openExternal) {
                        window.electronAPI.openExternal('https://aistudio.google.com/apikey');
                      } else {
                        window.open('https://aistudio.google.com/apikey', '_blank', 'noopener,noreferrer');
                      }
                    }}
                    style={{ color: 'var(--theme-accent-secondary)', textDecoration: 'underline', cursor: 'pointer' }}
                  > Google AI Studio</a>
                </li>
                <li>היכנסו עם חשבון Google שלכם</li>
                <li>לחצו על <strong>"Create API key"</strong></li>
                <li>בחרו פרויקט קיים או צרו חדש</li>
                <li>העתיקו את המפתח שנוצר והדביקו אותו בשדה למטה</li>
              </ol>

              <h3 style={{ marginTop: '16px' }}>אפשרות ב׳ — מפתח בתשלום (Google Cloud)</h3>
              <p style={{ marginBottom: '8px', color: 'var(--theme-text-secondary)' }}>
                המפתח בתשלום מאפשר גישה למודלי Gemini המתקדמים יותר (כמו Gemini Pro ו-Gemini Ultra)
                עם מכסות גבוהות בהרבה. <strong>התשלום מתבצע ישירות מול גוגל</strong> — לא דרך מערכת זו.
                בעצם, גוגל מוכרת לך זמן חישוב על המודלים שלהם, ואתה משלם לפי כמות השימוש.
              </p>
              <ol className="instructions-list">
                <li>
                  כנסו ל-
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (window.electronAPI && window.electronAPI.openExternal) {
                        window.electronAPI.openExternal('https://console.cloud.google.com/');
                      } else {
                        window.open('https://console.cloud.google.com/', '_blank', 'noopener,noreferrer');
                      }
                    }}
                    style={{ color: 'var(--theme-accent-secondary)', textDecoration: 'underline', cursor: 'pointer' }}
                  > Google Cloud Console</a>
                </li>
                <li>צרו פרויקט חדש (או השתמשו בקיים)</li>
                <li>הפעילו את <strong>Generative Language API</strong> בפרויקט</li>
                <li>הגדירו אמצעי תשלום בחשבון ה-Cloud שלכם</li>
                <li>עברו ל-<strong>APIs &amp; Services → Credentials</strong></li>
                <li>לחצו <strong>"Create Credentials → API key"</strong></li>
                <li>העתיקו את המפתח והדביקו אותו למטה</li>
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

// Returns { hasKey, isPaid } — the actual key is never on the client.
export const getApiKeyDetails = () => {
    const hasKey = localStorage.getItem('gemini_has_key') === 'true';
    const isPaid = localStorage.getItem('gemini_api_key_is_paid') === 'true';
    return { hasKey, isPaid };
};


export default ApiKeyModal;

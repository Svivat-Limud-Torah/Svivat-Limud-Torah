// frontend/src/components/TextOrganizationSettings.jsx
import React, { useState, useEffect } from 'react';
import './SettingsModal.css';
import { HEBREW_TEXT, DISABLE_ITALIC_FORMATTING_KEY } from '../utils/constants';

const TextOrganizationSettings = ({ isInModal = true }) => {
  const [disableItalicFormatting, setDisableItalicFormatting] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSetting = localStorage.getItem(DISABLE_ITALIC_FORMATTING_KEY);
    setDisableItalicFormatting(savedSetting === 'true');
  }, []);

  // Handle setting change
  const handleDisableItalicFormattingChange = (event) => {
    const newValue = event.target.checked;
    setDisableItalicFormatting(newValue);
    localStorage.setItem(DISABLE_ITALIC_FORMATTING_KEY, newValue.toString());
  };

  const containerStyle = isInModal ? {
    // When inside another modal, don't use fixed positioning
    backgroundColor: 'transparent',
    padding: '0',
    borderRadius: '0',
    zIndex: 'auto',
    color: 'var(--theme-text-primary, #E4E4E7)',
    width: '100%',
    maxWidth: 'none',
    boxShadow: 'none',
    direction: 'rtl',
    position: 'static',
    transform: 'none',
  } : {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'var(--theme-bg-primary, #18181B)',
    padding: '25px',
    borderRadius: '12px',
    zIndex: 1000,
    color: 'var(--theme-text-primary, #E4E4E7)',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    direction: 'rtl',
    border: '1px solid var(--theme-border-color, #27272A)',
  };

  return (
    <div style={containerStyle}>
      <div className="text-organization-settings">
        <h3 style={{ 
          color: 'var(--theme-text-primary, #E4E4E7)', 
          fontSize: '1.3em', 
          marginBottom: '20px',
          textAlign: 'right'
        }}>
          {HEBREW_TEXT.textOrganizationSettings.title}
        </h3>
        
        <div className="settings-group" style={{
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: 'var(--theme-bg-secondary, #27272A)',
          borderRadius: '8px',
          border: '1px solid var(--theme-border-color, #3F3F46)'
        }}>
          <div className="setting-item" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                color: 'var(--theme-text-primary, #E4E4E7)',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px',
                textAlign: 'right'
              }}>
                {HEBREW_TEXT.textOrganizationSettings.disableItalicFormatting}
              </label>
              <p style={{
                color: 'var(--theme-text-secondary, #A1A1AA)',
                fontSize: '14px',
                margin: '0',
                lineHeight: '1.4',
                textAlign: 'right'
              }}>
                {HEBREW_TEXT.textOrganizationSettings.disableItalicFormattingDescription}
              </p>
            </div>
            
            <div style={{ flexShrink: 0 }}>
              <label className="switch" style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={disableItalicFormatting}
                  onChange={handleDisableItalicFormattingChange}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span className="slider" style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: disableItalicFormatting ? 'var(--theme-accent-primary, #30363d)' : 'var(--theme-bg-tertiary, #4a5568)',
                  transition: '0.2s',
                  borderRadius: '24px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '18px',
                    width: '18px',
                    left: disableItalicFormatting ? '28px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '0.2s',
                    borderRadius: '50%'
                  }} />
                </span>
              </label>
            </div>
          </div>
        </div>

        <div style={{
          padding: '15px',
          backgroundColor: 'var(--theme-bg-tertiary, #3F3F46)',
          borderRadius: '8px',
          border: '1px solid var(--theme-border-color, #52525B)'
        }}>
          <div style={{
            fontSize: '14px',
            color: 'var(--theme-text-secondary, #A1A1AA)',
            textAlign: 'right',
            lineHeight: '1.5'
          }}>
            <strong style={{ color: 'var(--theme-text-primary, #E4E4E7)' }}>💡 הסבר:</strong>
            <br />
            כאשר האפשרות מופעלת, הבינה המלאכותית לא תוסיף עיצוב נטייה (כמו *טקסט*) בעת ארגון הטקסט. 
            היא עדיין תוכל להשתמש בעיצוב מודגש (**טקסט**) וכותרות.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextOrganizationSettings;

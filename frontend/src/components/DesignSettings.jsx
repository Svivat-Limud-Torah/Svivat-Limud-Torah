// frontend/src/components/DesignSettings.jsx
import React, { useState } from 'react';
import './SettingsModal.css';
import ColorPicker from './ColorPicker';
import {
  generateAllColorsFromMasters,
  defaultMasters,
  themePresets,
} from '../theme/themeEngine';

const DesignSettings = ({ currentTheme, onUpdateTheme }) => {
  const [openColorPicker, setOpenColorPicker] = useState(null);

  // Master color definitions — defaultValue references the shared engine
  const masterColors = [
    {
      key: 'mainBg',
      label: 'רקע ראשי',
      description: 'הרקע הראשי של כל התוכנה - כל הרקעים יתבססו על זה',
      icon: '',
      variable: '--master-bg-main',
      defaultValue: defaultMasters['--master-bg-main'],
      affectedElements: [
        'רקע ראשי של התוכנה',
        'רקע דף ראשי',
        'רקע עורך טקסט',
        'רקע פס גלילה'
      ]
    },
    {
      key: 'secondaryBg',
      label: 'רקע משני',
      description: 'רקע תפריטים, כפתורים וחלונות - גרסה בהירה יותר של הרקע הראשי',
      icon: '',
      variable: '--master-bg-secondary',
      defaultValue: defaultMasters['--master-bg-secondary'],
      affectedElements: [
        'רקע תפריטים',
        'רקע טאבים',
        'רקע כלים',
        'רקע שדות קלט'
      ]
    },
    {
      key: 'accent',
      label: 'צבע מבטא ',
      description: 'צבע להדגשות, כפתורים פעילים ובחירות - הצבע המרכזי של הממשק',
      icon: '',
      variable: '--master-accent',
      defaultValue: defaultMasters['--master-accent'],
      affectedElements: [
        'כפתורים',
        'גבולות',
        'הדגשות',
        'אלמנטים פעילים'
      ]
    },
    {
      key: 'text',
      label: 'צבע טקסט',
      description: 'צבע הטקסט הראשי - כל הטקסטים יתבססו על זה',
      icon: '',
      variable: '--master-text',
      defaultValue: defaultMasters['--master-text'],
      affectedElements: [
        'טקסט ראשי',
        'טקסט משני',
        'טקסט כפתורים',
        'טקסט תפריטים'
      ]
    },
    {
      key: 'border',
      label: 'גבולות וקווים',
      description: 'צבע גבולות, הפרדות וקווים בכל התוכנה',
      icon: '',
      variable: '--master-border',
      defaultValue: defaultMasters['--master-border'],
      affectedElements: [
        'גבולות תפריטים',
        'הפרדות',
        'מסגרות',
        'קווי הפרדה'
      ]
    }
  ];

  const handleApplyColor = (masterKey, newHex) => {
    const currentMasters = {};
    for (const [key, fallback] of Object.entries(defaultMasters)) {
      currentMasters[key] = currentTheme[key] || fallback;
    }
    const masterColor = masterColors.find(m => m.key === masterKey);
    if (masterColor) {
      currentMasters[masterColor.variable] = newHex;
      onUpdateTheme(generateAllColorsFromMasters(currentMasters));
    }
    setOpenColorPicker(null);
  };

  const applyThemePreset = (preset) => {
    setOpenColorPicker(null);
    onUpdateTheme(generateAllColorsFromMasters(preset.colors));
  };

  const resetToDefaults = () => {
    onUpdateTheme(generateAllColorsFromMasters(defaultMasters));
  };


  return (
    <div className="design-settings">
      <h3>הגדרות עיצוב חכמות</h3>
      <p style={{ color: 'var(--theme-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        <strong>רק 5 צבעים שולטים על כל התוכנה!</strong><br/>
        בחר צבע אחד - התוכנה תייצר אוטומטית את כל הגוונים והצלילים הנדרשים
      </p>

      {/* THEME PRESETS - CHOOSE YOUR STYLE */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: 'var(--theme-text-primary)', fontSize: '16px' }}>
          בחר סגנון עיצוב
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {themePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyThemePreset(preset)}
              style={{
                padding: '15px',
                backgroundColor: 'var(--theme-bg-secondary)',
                border: '2px solid var(--theme-border-color)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = 'var(--theme-accent-primary)';
                e.target.style.backgroundColor = 'var(--theme-hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'var(--theme-border-color)';
                e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
              }}
            >
              <div style={{
                fontSize: '24px',
                marginBottom: '8px'
              }}>
                {preset.icon}
              </div>
              <div style={{
                fontWeight: 'bold',
                color: 'var(--theme-text-primary)',
                fontSize: '14px',
                marginBottom: '4px'
              }}>
                {preset.name}
              </div>
              <div style={{
                color: 'var(--theme-text-secondary)',
                fontSize: '12px',
                lineHeight: '1.3'
              }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Master Color Controls */}
      <div className="color-groups">
        {masterColors.map((master) => (
          <div key={master.key} className="color-group-item">
            <div className="color-group-header">
              <div className="color-group-info">
                <span className="color-group-icon">{master.icon}</span>
                <div>
                  <h4>{master.label}</h4>
                  <p>{master.description}</p>
                </div>
              </div>
              <div 
                className="color-preview large"
                style={{ backgroundColor: currentTheme[master.variable] || master.defaultValue }}
                onClick={() => setOpenColorPicker(openColorPicker === master.key ? null : master.key)}
              />
            </div>
            
            <div className="affected-elements">
              <span>משפיע על:</span>
              <div className="element-tags">
                {master.affectedElements.map((element, index) => (
                  <span key={index} className="element-tag">{element}</span>
                ))}
              </div>
            </div>
            
            {openColorPicker === master.key && (
              <ColorPicker
                color={currentTheme[master.variable] || master.defaultValue}
                originalColor={currentTheme[master.variable] || master.defaultValue}
                onApply={(hex) => handleApplyColor(master.key, hex)}
                onCancel={() => setOpenColorPicker(null)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="theme-actions">
        <button 
          className="reset-colors-btn"
          onClick={resetToDefaults}
        >
          איפוס לברירת מחדל
        </button>
      </div>
    </div>
  );
};

export default DesignSettings;

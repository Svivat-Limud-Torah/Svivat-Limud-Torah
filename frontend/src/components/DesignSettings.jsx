// frontend/src/components/DesignSettings.jsx
import React, { useState, useRef, useEffect } from 'react';
import './SettingsModal.css';

const DesignSettings = ({ currentTheme, onUpdateTheme }) => {
  const [openColorPicker, setOpenColorPicker] = useState(null);
  const [tempColor, setTempColor] = useState('#000000');
  const [hue, setHue] = useState(0);
  const [lightness, setLightness] = useState(50);
  const [isLightMode, setIsLightMode] = useState(false);
  const colorPickerRef = useRef(null);

  // SUPER SIMPLE COLOR SYSTEM - Only 5 Master Colors Control Everything!
  const masterColors = [
    {
      key: 'mainBg',
      label: 'רקע ראשי 🌚',
      description: 'הרקע הראשי של כל התוכנה - כל הרקעים יתבססו על זה',
      icon: '�',
      variable: '--master-bg-main',
      defaultValue: '#0D1117',
      affectedElements: [
        'רקע ראשי של התוכנה',
        'רקע דף ראשי', 
        'רקע עורך טקסט',
        'רקע פס גלילה'
      ]
    },
    {
      key: 'secondaryBg', 
      label: 'רקע משני 🏗️',
      description: 'רקע תפריטים, כפתורים וחלונות - גרסה בהירה יותר של הרקע הראשי',
      icon: '🏗️',
      variable: '--master-bg-secondary',
      defaultValue: '#161b22',
      affectedElements: [
        'רקע תפריטים',
        'רקע טאבים',
        'רקע כלים',
        'רקע שדות קלט'
      ]
    },
    {
      key: 'accent',
      label: 'צבע מבטא 🎯',
      description: 'צבע להדגשות, כפתורים פעילים ובחירות - הצבע המרכזי של הממשק',
      icon: '🎯',
      variable: '--master-accent',
      defaultValue: '#161B22',
      affectedElements: [
        'כפתורים',
        'גבולות',
        'הדגשות',
        'אלמנטים פעילים'
      ]
    },
    {
      key: 'text',
      label: 'צבע טקסט 📝',
      description: 'צבע הטקסט הראשי - כל הטקסטים יתבססו על זה',
      icon: '📝',
      variable: '--master-text',
      defaultValue: '#e6edf3',
      affectedElements: [
        'טקסט ראשי',
        'טקסט משני',
        'טקסט כפתורים',
        'טקסט תפריטים'
      ]
    },
    {
      key: 'border',
      label: 'גבולות וקווים 📐',
      description: 'צבע גבולות, הפרדות וקווים בכל התוכנה',
      icon: '�',
      variable: '--master-border',
      defaultValue: '#30363d',
      affectedElements: [
        'גבולות תפריטים',
        'הפרדות',
        'מסגרות',
        'קווי הפרדה'
      ]
    }
  ];

  // Function to auto-generate ALL theme colors from just the 5 master colors!
  const generateAllColorsFromMasters = (masterValues) => {
    const main = masterValues['--master-bg-main'] || '#0d1117';
    const secondary = masterValues['--master-bg-secondary'] || '#161b22'; 
    const accent = masterValues['--master-accent'] || '#30363d';
    const text = masterValues['--master-text'] || '#e6edf3';
    const border = masterValues['--master-border'] || '#30363d';

    // Detect if we're in light mode (if background is light)
    const isLightMode = isLightColor(main);

    // Smart color variations - automatically lighter/darker versions
    const lightenColor = (color, amount = 0.2) => {
      const num = parseInt(color.replace("#", ""), 16);
      const amt = Math.round(2.55 * amount * 100);
      const R = Math.min(255, (num >> 16) + amt);
      const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
      const B = Math.min(255, (num & 0x0000FF) + amt);
      return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    };

    const darkenColor = (color, amount = 0.2) => {
      const num = parseInt(color.replace("#", ""), 16);
      const amt = Math.round(2.55 * amount * 100);
      const R = Math.max(0, (num >> 16) - amt);
      const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
      const B = Math.max(0, (num & 0x0000FF) - amt);
      return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    };

    // Function to determine if a color is light
    function isLightColor(color) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return brightness > 128;
    }

    // Smart text colors based on light/dark mode
    const editorTextColor = isLightMode ? '#000000' : '#ffffff';      // Pure black or white for editor
    const sidebarTextColor = isLightMode ? '#1a1a1a' : '#e6edf3';     // Near-black or light for sidebar
    const secondaryTextColor = isLightMode ? '#4a4a4a' : '#9ca3af';   // Dark gray or light gray for secondary text

    // Return ALL theme variables auto-generated from the 5 masters!
    return {
      // Store master colors
      '--master-bg-main': main,
      '--master-bg-secondary': secondary,
      '--master-accent': accent,
      '--master-text': text,
      '--master-border': border,

      // Auto-generate ALL background colors from masters
      '--theme-bg-primary': main,
      '--theme-bg-secondary': secondary,
      '--theme-page-bg': main,
      '--theme-editor-bg': main,
      '--theme-toolbar-bg': secondary,
      '--theme-tab-bg': secondary,
      '--theme-bg-tertiary': lightenColor(secondary, 0.1),

      // Auto-generate ALL interactive colors - BUTTONS USE ACCENT COLOR!
      '--theme-button-bg': accent,                    /* ALL BUTTONS use accent color */
      '--theme-button-hover-bg': lightenColor(accent, 0.2),
      '--theme-input-bg': darkenColor(secondary, 0.1),
      '--theme-hover-bg': lightenColor(accent, 0.1),
      
      // Force ALL button classes to use accent color
      '--btn-bg': accent,                            /* Force for .btn */
      '--btn-primary-bg': accent,                    /* Force for .btn-primary */
      '--btn-secondary-bg': accent,                  /* Force for .btn-secondary */
      '--btn-info-bg': accent,                       /* Force for .btn-info */
      '--btn-success-bg': accent,                    /* Force for .btn-success */
      '--btn-warning-bg': accent,                    /* Force for .btn-warning */

      // Smart text colors for different contexts
      '--theme-text-primary': text,                   // General UI text
      '--theme-text-secondary': secondaryTextColor,   // Secondary UI text
      '--theme-button-text-color': text,              // Button text
      '--theme-editor-text': editorTextColor,         // Editor content text (pure black/white)
      '--theme-sidebar-text': sidebarTextColor,       // Sidebar file/folder text (high contrast)

      // Auto-generate ALL accent colors
      '--theme-accent-primary': accent,
      '--theme-accent-secondary': lightenColor(accent, 0.3),
      '--theme-accent-color': accent,
      '--theme-accent-hover': lightenColor(accent, 0.2),

      // Auto-generate ALL status and border colors
      '--theme-border-color': border,
      '--theme-error-color': '#f85149',
      '--theme-warning-color': '#d29922', 
      '--theme-success-color': '#3fb950',

      // Auto-generate scrollbar colors
      '--theme-scrollbar-thumb': accent,
      '--theme-scrollbar-track': darkenColor(main, 0.1),
      '--theme-scrollbar-thumb-hover': lightenColor(accent, 0.2)
    };
  };

  // THEME PRESETS - Multiple ready-made themes
  const themePresets = [
    {
      id: 'light',
      name: 'מצב בהיר',
      description: 'עיצוב מקצועי בהיר כמו Wix',
      icon: '☀️',
      colors: {
        '--master-bg-main': '#ffffff',        // Pure white background  
        '--master-bg-secondary': '#f8f9fa',   // Very subtle light gray (almost white)
        '--master-accent': '#CCFBFB',         // Beautiful light cyan accent
        '--master-text': '#2d3748',           // Dark gray text (easier on eyes than pure black)
        '--master-border': '#e2e8f0'          // Very light border gray
      }
    },
    {
      id: 'dark-default',
      name: 'מצב כהה קלאסי',
      description: 'עיצוב כהה בסגנון GitHub',
      icon: '🌙',
      colors: {
        '--master-bg-main': '#161B22',
        '--master-bg-secondary': '#161b22',
        '--master-accent': '#161B22',
        '--master-text': '#e6edf3',
        '--master-border': '#30363d'
      }
    },
    {
      id: 'dark-blue',
      name: 'מצב כהה כחול',
      description: 'עיצוב כהה עם גוונים כחולים מקצועיים',
      icon: '🌃',
      colors: {
        '--master-bg-main': '#0a0b15',        // Much darker blue-gray background
        '--master-bg-secondary': '#0f1020',   // Very dark blue-gray
        '--master-accent': '#1a1d35',         // Dark blue accent
        '--master-text': '#c1d2f0',           // Softer light blue text
        '--master-border': '#252845'          // Darker blue border
      }
    },
    {
      id: 'dark-warm',
      name: 'מצב כהה חם',
      description: 'עיצוב כהה עם גוונים חמים',
      icon: '🔥',
      colors: {
        '--master-bg-main': '#1c1917',        // Very dark warm gray
        '--master-bg-secondary': '#292524',   // Dark warm gray
        '--master-accent': '#44403c',         // Medium warm gray
        '--master-text': '#f5f5f4',           // Light warm text
        '--master-border': '#57534e'          // Border warm gray
      }
    },
    {
      id: 'dark-forest',
      name: 'מצב כהה יער',
      description: 'עיצוב כהה עם גוונים ירוקים טבעיים',
      icon: '🌲',
      colors: {
        '--master-bg-main': '#0f1419',        // Very dark forest
        '--master-bg-secondary': '#1a2332',   // Dark green-gray
        '--master-accent': '#2d4a3e',         // Forest green accent
        '--master-text': '#e6f7ff',           // Light mint text
        '--master-border': '#3d5a50'          // Green-gray border
      }
    },
    {
      id: 'dark-charcoal',
      name: 'מצב כהה פחם',
      description: 'עיצוב כהה מינימליסטי עם אפור עמוק',
      icon: '⚫',
      colors: {
        '--master-bg-main': '#1e1e1e',        // Charcoal black
        '--master-bg-secondary': '#2d2d2d',   // Dark charcoal
        '--master-accent': '#404040',         // Medium charcoal
        '--master-text': '#ffffff',           // Pure white text
        '--master-border': '#555555'          // Light charcoal border
      }
    }
  ];

  // Apply a theme preset
  const applyThemePreset = (preset) => {
    const newTheme = generateAllColorsFromMasters(preset.colors);
    onUpdateTheme(newTheme);
  };

  // Color conversion utilities

  // Helper functions for color manipulation
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  };

  const hslToHex = (h, s, l) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setOpenColorPicker(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const openColorPickerFor = (groupKey, currentColor) => {
    setTempColor(currentColor);
    const [h, s, l] = hexToHsl(currentColor);
    setHue(h);
    setLightness(l);
    setOpenColorPicker(groupKey);
  };

  const handleColorWheelClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    
    // Calculate distance from center
    const distance = Math.sqrt(x * x + y * y);
    const maxRadius = Math.min(centerX, centerY) * 0.9; // 90% of radius for better UX
    
    // Only respond if click is within the wheel
    if (distance <= maxRadius) {
      const angle = Math.atan2(y, x);
      const hueValue = ((angle * 180 / Math.PI) + 360) % 360;
      
      setHue(hueValue);
      updateTempColor(hueValue, lightness);
    }
  };

  const handleLightnessSliderClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const lightnessValue = (x / rect.width) * 100;
    
    setLightness(lightnessValue);
    updateTempColor(hue, lightnessValue);
  };

  const updateTempColor = (h, l) => {
    const newColor = hslToHex(h, 85, l); // Using higher saturation for more vivid colors
    setTempColor(newColor);
  };

  const handleHexInputChange = (event) => {
    let hex = event.target.value;
    // Add # if missing
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      setTempColor(hex);
      const [h, s, l] = hexToHsl(hex);
      setHue(h);
      setLightness(l);
    }
  };

  const applyColor = () => {
    if (openColorPicker) {
      // Get current master values
      const currentMasters = {
        '--master-bg-main': currentTheme['--master-bg-main'] || '#0d1117',
        '--master-bg-secondary': currentTheme['--master-bg-secondary'] || '#161b22',
        '--master-accent': currentTheme['--master-accent'] || '#161B22',
        '--master-text': currentTheme['--master-text'] || '#e6edf3',
        '--master-border': currentTheme['--master-border'] || '#30363d'
      };

      // Find which master color we're updating
      const masterColor = masterColors.find(m => m.key === openColorPicker);
      if (masterColor) {
        // Update the specific master color
        currentMasters[masterColor.variable] = tempColor;

        // Generate ALL theme colors from the updated masters
        const allColors = generateAllColorsFromMasters(currentMasters);
        
        // Apply to theme
        onUpdateTheme(allColors);
      }
      setOpenColorPicker(null);
    }
  };

  const cancelColorPicker = () => {
    setOpenColorPicker(null);
  };

  const resetToDefaults = () => {
    // Reset to default master colors
    const defaultMasters = {
      '--master-bg-main': '#0d1117',
      '--master-bg-secondary': '#161b22',
      '--master-accent': '#161B22',
      '--master-text': '#e6edf3',
      '--master-border': '#30363d'
    };

    // Generate all theme colors from default masters
    const defaultTheme = generateAllColorsFromMasters(defaultMasters);
    onUpdateTheme(defaultTheme);
  };

  // Calculate color wheel cursor position
  const getCursorPosition = () => {
    const angle = (hue * Math.PI) / 180;
    const radius = 70; // Distance from center
    const x = Math.cos(angle) * radius + 100; // 100 is center
    const y = Math.sin(angle) * radius + 100;
    return { x, y };
  };

  const cursorPos = getCursorPosition();

  return (
    <div className="design-settings">
      <h3>🎨 הגדרות עיצוב חכמות</h3>
      <p style={{ color: 'var(--theme-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        <strong>רק 5 צבעים שולטים על כל התוכנה!</strong><br/>
        בחר צבע אחד - התוכנה תייצר אוטומטית את כל הגוונים והצלילים הנדרשים 🚀
      </p>

      {/* THEME PRESETS - CHOOSE YOUR STYLE */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: 'var(--theme-text-primary)', fontSize: '16px' }}>
          🎭 בחר סגנון עיצוב
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

      {/* Debug: Show current button color */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: 'var(--theme-bg-secondary)', 
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--theme-text-secondary)'
      }}>
        🔧 Debug: Current button color = <span style={{color: 'var(--theme-text-primary)'}}>{currentTheme['--theme-button-bg'] || 'Not set'}</span>
        <br/>
        🎯 Accent color = <span style={{color: 'var(--theme-text-primary)'}}>{currentTheme['--master-accent'] || 'Not set'}</span>
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
                onClick={() => openColorPickerFor(master.key, currentTheme[master.variable] || master.defaultValue)}
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
              <div className="color-picker-wrapper" ref={colorPickerRef}>
                <div className="color-picker">
                  <div className="color-wheel-container">
                    <div 
                      className="color-wheel"
                      onClick={handleColorWheelClick}
                    >
                      <div 
                        className="color-wheel-cursor"
                        style={{ 
                          left: `${cursorPos.x}px`, 
                          top: `${cursorPos.y}px` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div 
                    className="lightness-slider"
                    style={{
                      background: `linear-gradient(to right, 
                        hsl(${hue}, 80%, 0%), 
                        hsl(${hue}, 80%, 50%), 
                        hsl(${hue}, 80%, 100%))`
                    }}
                    onClick={handleLightnessSliderClick}
                  >
                    <div 
                      className="lightness-cursor"
                      style={{ left: `${lightness}%` }}
                    />
                  </div>
                  
                  <div className="color-input-container">
                    <input
                      type="text"
                      value={tempColor.toUpperCase()}
                      onChange={handleHexInputChange}
                      className="color-input"
                      placeholder="#000000"
                    />
                    <div 
                      style={{ 
                        width: '30px', 
                        height: '30px', 
                        backgroundColor: tempColor,
                        border: '1px solid var(--theme-border-color)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  
                  <div className="color-picker-buttons">
                    <button 
                      className="color-picker-btn cancel"
                      onClick={cancelColorPicker}
                    >
                      ביטול
                    </button>
                    <button 
                      className="color-picker-btn apply"
                      onClick={applyColor}
                    >
                      החל
                    </button>
                  </div>
                </div>
              </div>
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

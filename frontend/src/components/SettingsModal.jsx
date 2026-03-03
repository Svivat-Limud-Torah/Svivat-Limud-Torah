// frontend/src/components/SettingsModal.jsx
import React, { useState } from 'react';
import NotificationSettings from './NotificationSettings';
import DesignSettings from './DesignSettings';
import { API_BASE_URL, IS_WEB_MODE } from '../utils/constants';
import WebApiService from '../services/WebApiService';
import './SettingsModal.css';

const FONT_OPTIONS = [
  'Arial',
  'David',
  'Frank Ruhl Libre',
  'Miriam',
  'Narkisim',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Courier New',
];

const SettingsModal = ({
  isOpen,
  onClose,
  // Notification settings props
  notificationSettings,
  onUpdateNotificationSettings,
  isNotificationLoading,
  // Design settings props
  currentTheme,
  onUpdateTheme,
  onOpenFileConversion,
  // Editor settings props
  editorFontSize,
  onEditorFontSizeChange,
  presentationFontSize,
  onPresentationFontSizeChange,
  appFont,
  onAppFontChange,
  editorFont,
  onEditorFontChange,
  showLineNumbers,
  onToggleLineNumbers,
  highlightActiveLine,
  onToggleHighlightActiveLine,
  autoSaveEnabled,
  onToggleAutoSaveEnabled,
  // AI settings
  selectedAiModel,
  // General settings
  onResetTour,
  showFormattingToolbar,
  onToggleFormattingToolbar,
  onDeleteAllData,
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleteAllStatus, setDeleteAllStatus] = useState(null); // { type: 'success'|'error', msg }

  // Italic formatting toggle (managed locally, persisted to localStorage)
  const [disableItalicFormatting, setDisableItalicFormatting] = useState(() => {
    return localStorage.getItem('disable_italic_formatting') === 'true';
  });

  // File conversion auto-prompt toggle
  const [fileConversionNeverShow, setFileConversionNeverShow] = useState(() => {
    return localStorage.getItem('fileConversionNeverShow') === 'true';
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const tabs = [
    { id: 'general', label: 'כללי', icon: '' },
    { id: 'editor', label: 'עורך טקסט', icon: '' },
    { id: 'design', label: 'עיצוב', icon: '' },
    { id: 'ai', label: 'בינה מלאכותית', icon: '' },
    { id: 'notifications', label: 'התראות', icon: '' },
    { id: 'shortcuts', label: 'קיצורי מקלדת', icon: '' },
    { id: 'about', label: 'אודות', icon: '' },
  ];

  const ToggleSwitch = ({ checked, onChange, label, description }) => (
    <div className="setting-row">
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {description && <span className="setting-description">{description}</span>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={!!checked} onChange={onChange} />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );

  const SliderSetting = ({ value, onChange, min, max, step, label, description, unit }) => (
    <div className="setting-row">
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {description && <span className="setting-description">{description}</span>}
      </div>
      <div className="slider-control">
        <input
          type="range"
          min={min}
          max={max}
          step={step || 1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="settings-slider"
        />
        <span className="slider-value">{value}{unit || ''}</span>
      </div>
    </div>
  );

  const SelectSetting = ({ value, onChange, options, label, description }) => (
    <div className="setting-row">
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {description && <span className="setting-description">{description}</span>}
      </div>
      <select
        className="settings-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  const FontSetting = ({ value, onChange, options, label, description }) => (
    <div className="font-setting-card">
      <div className="font-setting-header">
        <div className="setting-info">
          <span className="setting-label">{label}</span>
          {description && <span className="setting-description">{description}</span>}
        </div>
        <select
          className="font-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt} value={opt} style={{ fontFamily: opt }}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="font-preview" style={{ fontFamily: value }}>
        אבגדהו — שרה שרה שיר שמח
      </div>
    </div>
  );

  const handleDisableItalicChange = () => {
    const newValue = !disableItalicFormatting;
    setDisableItalicFormatting(newValue);
    localStorage.setItem('disable_italic_formatting', newValue.toString());
  };

  const handleFileConversionToggle = () => {
    const newValue = !fileConversionNeverShow;
    setFileConversionNeverShow(newValue);
    localStorage.setItem('fileConversionNeverShow', newValue.toString());
  };

  const handleResetAllSettings = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    localStorage.removeItem('torah-ide-theme-settings');
    localStorage.removeItem('editorFontSize');
    localStorage.removeItem('presentationFontSize');
    localStorage.removeItem('appFont');
    localStorage.removeItem('editorFont');
    localStorage.removeItem('disable_italic_formatting');
    localStorage.removeItem('torah-ide-tour-completed');
    localStorage.removeItem('fileConversionNeverShow');
    setConfirmReset(false);
    window.location.reload();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">הגדרות כלליות</h3>

            <div className="settings-group">
              <h4 className="settings-group-title">סיור מודרך</h4>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">הפעל סיור מודרך מחדש</span>
                  <span className="setting-description">הפעל את הסיור המודרך שמסביר את ממשק התוכנה מההתחלה</span>
                </div>
                <button className="settings-action-btn" onClick={() => { onResetTour?.(); onClose(); }}>
                  הפעל סיור
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">המרת קבצים</h4>
              <ToggleSwitch
                checked={fileConversionNeverShow}
                onChange={handleFileConversionToggle}
                label="הסתר חלון המרת קבצים בהפעלה"
                description="מנע הצגת חלון המרת קבצים אוטומטית בכל הפעלה של התוכנה"
              />
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">פתח כלי המרת קבצים</span>
                  <span className="setting-description">המר קבצי Word, PDF ועוד לפורמט טקסט</span>
                </div>
                <button className="settings-action-btn" onClick={() => { onOpenFileConversion?.(); }}>
                  פתח ממיר
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">ניהול נתונים</h4>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">אפס את כל ההגדרות</span>
                  <span className="setting-description">מחק את כל ההגדרות השמורות וחזור לברירת המחדל. פעולה זו תטען מחדש את הדף.</span>
                </div>
                <button
                  className={`settings-action-btn ${confirmReset ? 'danger' : 'warning'}`}
                  onClick={handleResetAllSettings}
                >
                  {confirmReset ? 'לחץ שוב לאישור' : 'אפס הכל'}
                </button>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">מחק את כל הנתונים שלי</span>
                  <span className="setting-description">מחיקה מוחלטת של כל הנתונים: שאלונים, חזרות, סטטיסטיקות, סיכומים ועוד. פעולה בלתי הפיכה.</span>
                </div>
                <button
                  className={`settings-action-btn ${confirmDeleteAll ? 'danger' : 'warning'}`}
                  onClick={async () => {
                    if (!confirmDeleteAll) { setConfirmDeleteAll(true); setDeleteAllStatus(null); return; }
                    try {
                      if (IS_WEB_MODE) {
                        await WebApiService.resetAllUserData();
                      } else {
                        await fetch(`${API_BASE_URL}/user/reset-all-data`, { method: 'DELETE' });
                      }
                      setDeleteAllStatus({ type: 'success', msg: 'כל הנתונים נמחקו. הדף ייטען מחדש...' });
                      setConfirmDeleteAll(false);
                      setTimeout(() => { if (onDeleteAllData) onDeleteAllData(); else window.location.reload(); }, 2000);
                    } catch { setDeleteAllStatus({ type: 'error', msg: 'שגיאה במחיקה. נסה שוב.' }); setConfirmDeleteAll(false); }
                  }}
                >
                  {confirmDeleteAll ? 'לחץ שוב לאישור' : 'מחק הכל'}
                </button>
              </div>
              {deleteAllStatus && (
                <p style={{ fontSize: '0.85rem', marginTop: 6, color: deleteAllStatus.type === 'success' ? '#4ade80' : '#f87171' }}>
                  {deleteAllStatus.msg}
                </p>
              )}
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">מידע אחסון</h4>
              <div className="storage-info">
                <div className="storage-item">
                  <span>ערכי תצורה שמורים:</span>
                  <span className="storage-value">{Object.keys(localStorage).length} פריטים</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'editor':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">הגדרות עורך טקסט</h3>

            <div className="settings-group">
              <h4 className="settings-group-title">גודל גופן</h4>
              <SliderSetting
                value={editorFontSize || 16}
                onChange={onEditorFontSizeChange}
                min={10}
                max={40}
                label="גודל גופן עורך"
                description="גודל הטקסט בעורך הראשי"
                unit="px"
              />
              <SliderSetting
                value={presentationFontSize || 16}
                onChange={onPresentationFontSizeChange}
                min={10}
                max={60}
                label="גודל גופן מצגת"
                description="גודל הטקסט במצב הצגה / תצוגה מקדימה"
                unit="px"
              />
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">גופנים</h4>
              <div className="font-settings-grid">
                <FontSetting
                  value={appFont || 'Arial'}
                  onChange={onAppFontChange}
                  options={FONT_OPTIONS}
                  label="גופן אפליקציה"
                  description="הגופן המשמש בכל ממשק התוכנה (תפריטים, כפתורים, וכו')"
                />
                <FontSetting
                  value={editorFont || 'Segoe UI'}
                  onChange={onEditorFontChange}
                  options={FONT_OPTIONS}
                  label="גופן עורך"
                  description="הגופן המשמש באזור עריכת הטקסט"
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">שמירת קבצים</h4>
              <ToggleSwitch
                checked={autoSaveEnabled}
                onChange={() => onToggleAutoSaveEnabled?.()}
                label="שמירה אוטומטית"
                description="שמור שינויים בטקסט באופן אוטומטי תוך כדי עבודה"
              />
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">תצוגת עורך</h4>
              <ToggleSwitch
                checked={showLineNumbers}
                onChange={() => onToggleLineNumbers?.()}
                label="מספרי שורות"
                description="הצג מספרי שורות בצד העורך"
              />
              <ToggleSwitch
                checked={highlightActiveLine}
                onChange={() => onToggleHighlightActiveLine?.()}
                label="הדגשת שורה פעילה"
                description="הדגש את השורה שבה נמצא הסמן"
              />
              <ToggleSwitch
                checked={showFormattingToolbar}
                onChange={() => onToggleFormattingToolbar?.()}
                label="סרגל עיצוב"
                description="הצג את סרגל כלי העיצוב מעל העורך"
              />
            </div>
          </div>
        );

      case 'design':
        return (
          <DesignSettings
            currentTheme={currentTheme}
            onUpdateTheme={onUpdateTheme}
          />
        );

      case 'ai':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">הגדרות בינה מלאכותית</h3>

            <div className="settings-group">
              <h4 className="settings-group-title">מודל בינה מלאכותית</h4>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">מודל נוכחי</span>
                  <span className="setting-description">המודל שמשמש לכל פעולות הבינה המלאכותית</span>
                </div>
                <span className="setting-badge">{selectedAiModel || 'לא נבחר'}</span>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">סטטוס מפתח API</span>
                  <span className="setting-description">מפתח API נדרש לשימוש בתכונות בינה מלאכותית</span>
                </div>
                <span className="setting-badge">
                  {localStorage.getItem('gemini_api_key_is_paid') === 'true' ? 'בתשלום' : 'חינמי'}
                </span>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">ארגון טקסט</h4>
              <ToggleSwitch
                checked={disableItalicFormatting}
                onChange={handleDisableItalicChange}
                label="בטל עיצוב נטייה (איטליק)"
                description="מנע מהבינה המלאכותית להוסיף עיצוב נטייה (*טקסט*) בעת ארגון טקסט"
              />
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">טיפים</h4>
              <div className="tips-container">
                <div className="tip-item">
                  <span className="tip-icon"></span>
                  <span>לשינוי מודל AI או הוספת מודל מותאם אישית, השתמש בכפתור &quot;בחר מודל&quot; בסרגל הכלים</span>
                </div>
                <div className="tip-item">
                  <span className="tip-icon"></span>
                  <span>מודלים בתשלום מספקים תוצאות איכותיות יותר ומהירות יותר</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <NotificationSettings
            currentSettings={notificationSettings}
            onUpdateSettings={onUpdateNotificationSettings}
            onClose={() => { }}
            isLoading={isNotificationLoading}
            isInModal={true}
          />
        );

      case 'shortcuts':
        return (
          <div className="shortcuts-section">
            <h3>קיצורי מקלדת</h3>
            <div className="shortcuts-info">
              <p>להלן רשימת קיצורי המקלדת הזמינים בתוכנה:</p>

              <div className="shortcuts-category">
                <h4>עריכת טקסט</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + Z</span>
                    <span className="shortcut-description">בטל פעולה</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + Y</span>
                    <span className="shortcut-description">החזר פעולה</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + A</span>
                    <span className="shortcut-description">בחר הכל</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + C</span>
                    <span className="shortcut-description">העתק</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + V</span>
                    <span className="shortcut-description">הדבק</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + X</span>
                    <span className="shortcut-description">גזור</span>
                  </div>
                </div>
              </div>

              <div className="shortcuts-category">
                <h4>ניווט ותצוגה</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + Q</span>
                    <span className="shortcut-description">מצב Zen (מסך מלא)</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Shift + Q</span>
                    <span className="shortcut-description">הסתר/הצג סרגל כלים</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + F</span>
                    <span className="shortcut-description">חיפוש בטקסט</span>
                  </div>
                </div>
              </div>

              <div className="shortcuts-category">
                <h4>ניהול קבצים</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + S</span>
                    <span className="shortcut-description">שמור קובץ</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + Shift + S</span>
                    <span className="shortcut-description">שמור בשם</span>
                  </div>
                </div>
              </div>

              <div className="shortcuts-category">
                <h4>עכבר</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <span className="shortcut-keys">Ctrl + גלגל עכבר</span>
                    <span className="shortcut-description">שנה גודל גופן</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-keys">גרירת מפריד</span>
                    <span className="shortcut-description">שנה רוחב סרגל צד</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="about-section">
            <div className="about-hero">
              <div className="about-logo"></div>
              <h3>סביבת לימוד תורה</h3>
              <span className="about-version-badge">גרסה 16</span>
            </div>

            <div className="about-details">
              <div className="about-detail-card">
                <span className="about-detail-icon"></span>
                <div>
                  <strong>יצירת קשר</strong>
                  <p dir="ltr">svivatlimudtorah@gmail.com</p>
                </div>
              </div>
              <div className="about-detail-card">
                <span className="about-detail-icon">©️</span>
                <div>
                  <strong>זכויות יוצרים</strong>
                  <p>כל הזכויות שמורות 2025</p>
                </div>
              </div>
              <div className="about-detail-card">
                <span className="about-detail-icon"></span>
                <div>
                  <strong>מטרת הפרויקט</strong>
                  <p>הארגון פועל ללא מטרות רווח למען לומדי התורה</p>
                </div>
              </div>
            </div>

            <div className="about-features">
              <h4>יכולות התוכנה</h4>
              <div className="feature-grid">
                <div className="feature-item">ארגון טקסט בבינה מלאכותית</div>
                <div className="feature-item">כרטיסיות למידה</div>
                <div className="feature-item">חיפוש חכם</div>
                <div className="feature-item">מעקב התקדמות</div>
                <div className="feature-item">צ'אט יהדות</div>
                <div className="feature-item">עורך טקסט מתקדם</div>
                <div className="feature-item">ניהול קבצים</div>
                <div className="feature-item">ערכות נושא מותאמות</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-backdrop settings-modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header settings-modal-header">
          <h2>הגדרות</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-modal-body">
          <div className="settings-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setConfirmReset(false); }}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-content">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;



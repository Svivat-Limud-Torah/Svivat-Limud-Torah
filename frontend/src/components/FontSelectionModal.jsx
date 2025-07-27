import React, { useState, useEffect, useRef } from 'react';
import './FontSelectionModal.css';
import { HEBREW_TEXT } from '../utils/constants';

const FontSelectionModal = ({ isOpen, onClose, currentAppFont, currentEditorFont, onSaveAppFont, onSaveEditorFont }) => {
  const [selectedTab, setSelectedTab] = useState('app'); // 'app' or 'editor'
  const [selectedAppFont, setSelectedAppFont] = useState(currentAppFont);
  const [selectedEditorFont, setSelectedEditorFont] = useState(currentEditorFont);
  const [customFont, setCustomFont] = useState('');
  const [uploadedFonts, setUploadedFonts] = useState([]);
  const fileInputRef = useRef(null);

  // רשימת פונטים נפוצים
  const commonFonts = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Arial Black',
    'Impact',
    'Comic Sans MS',
    'Courier New',
    'Lucida Console',
    'Monaco',
    'Consolas',
    'Source Code Pro',
    'Fira Code',
    'JetBrains Mono'
  ];

  // פונטים עבריים
  const hebrewFonts = [
    'Arial Unicode MS',
    'David',
    'Frank Ruehl CLM',
    'Narkisim',
    'Rod',
    'Miriam',
    'Fixed Miriam Transparent',
    'Levenim MT',
    'Times New Roman',
    'Tahoma',
    'Calibri'
  ];

  // פונטים למטקסט/ספרות
  const textFonts = [
    'Times New Roman',
    'Georgia',
    'Garamond',
    'Book Antiqua',
    'Palatino',
    'Cambria',
    'Charter',
    'Crimson Text',
    'Libre Baskerville',
    'Lora',
    'Merriweather',
    'Playfair Display'
  ];

  useEffect(() => {
    if (isOpen) {
      setSelectedAppFont(currentAppFont);
      setSelectedEditorFont(currentEditorFont);
      loadUploadedFonts();
    }
  }, [isOpen, currentAppFont, currentEditorFont]);

  const loadUploadedFonts = () => {
    try {
      const saved = localStorage.getItem('uploadedFonts');
      if (saved) {
        setUploadedFonts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('שגיאה בטעינת פונטים מותאמים אישית:', error);
    }
  };

  const saveUploadedFonts = (fonts) => {
    try {
      localStorage.setItem('uploadedFonts', JSON.stringify(fonts));
      setUploadedFonts(fonts);
    } catch (error) {
      console.error('שגיאה בשמירת פונטים מותאמים אישית:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (selectedTab === 'app') {
      onSaveAppFont(selectedAppFont);
    } else {
      onSaveEditorFont(selectedEditorFont);
    }
    onClose();
  };

  const handleFontChange = (fontName) => {
    if (selectedTab === 'app') {
      setSelectedAppFont(fontName);
    } else {
      setSelectedEditorFont(fontName);
    }
  };

  const handleAddCustomFont = () => {
    if (customFont.trim() && !getAllFonts().includes(customFont.trim())) {
      const newUploadedFonts = [...uploadedFonts, customFont.trim()];
      saveUploadedFonts(newUploadedFonts);
      setCustomFont('');
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      if (file.type.includes('font') || file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
        const fontName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
        
        // יצירת URL זמני לקובץ הפונט
        const fontUrl = URL.createObjectURL(file);
        
        // יצירת FontFace חדש
        const fontFace = new FontFace(fontName, `url(${fontUrl})`);
        
        fontFace.load().then(() => {
          document.fonts.add(fontFace);
          
          // הוספת הפונט לרשימה
          const newUploadedFonts = [...uploadedFonts, fontName];
          saveUploadedFonts(newUploadedFonts);
          
          alert(`הפונט "${fontName}" הועלה בהצלחה!`);
        }).catch(error => {
          console.error('שגיאה בטעינת הפונט:', error);
          alert(`שגיאה בטעינת הפונט "${fontName}"`);
        });
      }
    });
    
    // איפוס שדה הקובץ
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveCustomFont = (fontToRemove) => {
    const newUploadedFonts = uploadedFonts.filter(font => font !== fontToRemove);
    saveUploadedFonts(newUploadedFonts);
  };

  const getAllFonts = () => {
    return [...commonFonts, ...hebrewFonts, ...textFonts, ...uploadedFonts];
  };

  const getCurrentFont = () => {
    return selectedTab === 'app' ? selectedAppFont : selectedEditorFont;
  };

  const FontPreview = ({ fontName }) => (
    <div 
      className={`font-preview-item ${getCurrentFont() === fontName ? 'selected' : ''}`}
      onClick={() => handleFontChange(fontName)}
      style={{ fontFamily: fontName }}
    >
      <span className="font-name">{fontName}</span>
      <span className="font-sample">
        {selectedTab === 'app' ? 'Torah IDE - בית מדרש דיגיטלי' : 'הטקסט יוצג בפונט זה'}
      </span>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content font-selection-modal">
        <h2>בחירת פונט</h2>
        
        <div className="font-tabs">
          <button 
            className={`tab-button ${selectedTab === 'app' ? 'active' : ''}`}
            onClick={() => setSelectedTab('app')}
          >
            פונט התוכנה
          </button>
          <button 
            className={`tab-button ${selectedTab === 'editor' ? 'active' : ''}`}
            onClick={() => setSelectedTab('editor')}
          >
            פונט העורך
          </button>
        </div>

        <div className="modal-body">
          <div className="font-category">
            <h3>פונטים נפוצים</h3>
            <div className="font-list">
              {commonFonts.map(font => (
                <FontPreview key={font} fontName={font} />
              ))}
            </div>
          </div>

          <div className="font-category">
            <h3>פונטים עבריים</h3>
            <div className="font-list">
              {hebrewFonts.map(font => (
                <FontPreview key={font} fontName={font} />
              ))}
            </div>
          </div>

          <div className="font-category">
            <h3>פונטים לטקסט</h3>
            <div className="font-list">
              {textFonts.map(font => (
                <FontPreview key={font} fontName={font} />
              ))}
            </div>
          </div>

          {uploadedFonts.length > 0 && (
            <div className="font-category">
              <h3>פונטים מותאמים אישית</h3>
              <div className="font-list">
                {uploadedFonts.map(font => (
                  <div key={font} className="custom-font-item">
                    <FontPreview fontName={font} />
                    <button 
                      className="remove-font-btn"
                      onClick={() => handleRemoveCustomFont(font)}
                      title="הסר פונט"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="font-category">
            <h3>הוסף פונט מותאם אישית</h3>
            <div className="custom-font-controls">
              <div className="font-name-input">
                <input
                  type="text"
                  placeholder="שם הפונט (למשל: 'My Custom Font')"
                  value={customFont}
                  onChange={(e) => setCustomFont(e.target.value)}
                />
                <button onClick={handleAddCustomFont} disabled={!customFont.trim()}>
                  הוסף
                </button>
              </div>
              
              <div className="font-file-upload">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".ttf,.otf,.woff,.woff2"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()}>
                  העלה קבצי פונט
                </button>
                <small>תומך בקבצי TTF, OTF, WOFF, WOFF2</small>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleSave} className="button-primary">
            שמור
          </button>
          <button onClick={onClose} className="button-secondary">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontSelectionModal;

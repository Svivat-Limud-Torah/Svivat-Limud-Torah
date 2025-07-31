import React, { useState, useEffect } from 'react';
import './FontSizeModal.css';
import { HEBREW_TEXT } from '../utils/constants'; // Assuming HEBREW_TEXT is used for button labels etc.

const FontSizeModal = ({ isOpen, onClose, currentEditorSize, currentPresentationSize, onSaveFontSize }) => {
  const [selectedTab, setSelectedTab] = useState('editor'); // 'editor' or 'presentation'
  const [editorSize, setEditorSize] = useState(currentEditorSize);
  const [presentationSize, setPresentationSize] = useState(currentPresentationSize);

  useEffect(() => {
    setEditorSize(currentEditorSize);
    setPresentationSize(currentPresentationSize);
  }, [currentEditorSize, currentPresentationSize, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (selectedTab === 'editor') {
      const newSize = parseInt(editorSize, 10);
      if (!isNaN(newSize) && newSize > 0) {
        onSaveFontSize(newSize, 'editor');
        onClose();
      } else {
        alert(HEBREW_TEXT.fontSizeModal?.invalidSizeError || "Invalid font size. Please enter a positive number.");
      }
    } else if (selectedTab === 'presentation') {
      const newSize = parseInt(presentationSize, 10);
      if (!isNaN(newSize) && newSize > 0) {
        onSaveFontSize(newSize, 'presentation');
        onClose();
      } else {
        alert(HEBREW_TEXT.fontSizeModal?.invalidSizeError || "Invalid font size. Please enter a positive number.");
      }
    }
  };

  const handleInputChange = (e) => {
    if (selectedTab === 'editor') {
      setEditorSize(e.target.value);
    } else {
      setPresentationSize(e.target.value);
    }
  };

  const getCurrentSize = () => {
    return selectedTab === 'editor' ? editorSize : presentationSize;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content font-size-modal">
        <h2>{HEBREW_TEXT.fontSizeModal?.title || "Set Font Size"}</h2>
        
        <div className="font-tabs">
          <button 
            className={`tab-button ${selectedTab === 'editor' ? 'active' : ''}`}
            onClick={() => setSelectedTab('editor')}
          >
            עורך
          </button>
          <button 
            className={`tab-button ${selectedTab === 'presentation' ? 'active' : ''}`}
            onClick={() => setSelectedTab('presentation')}
          >
            תצוגה
          </button>
        </div>

        <div className="modal-body">
          <label htmlFor="font-size-input">
            {selectedTab === 'editor' 
              ? (HEBREW_TEXT.fontSizeModal?.editorLabel || "גודל גופן עורך (פיקסלים):") 
              : (HEBREW_TEXT.fontSizeModal?.presentationLabel || "גודל גופן תצוגה (פיקסלים):")
            }
          </label>
          <input
            type="number"
            id="font-size-input"
            value={getCurrentSize()}
            onChange={handleInputChange}
            min="1"
          />
        </div>
        <div className="modal-actions">
          <button onClick={handleSave} className="button-primary">
            {HEBREW_TEXT.save || "Save"}
          </button>
          <button onClick={onClose} className="button-secondary">
            {HEBREW_TEXT.cancel || "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontSizeModal;

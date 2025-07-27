import React, { useState, useEffect } from 'react';
import './FontSizeModal.css';
import { HEBREW_TEXT } from '../utils/constants'; // Assuming HEBREW_TEXT is used for button labels etc.

const FontSizeModal = ({ isOpen, onClose, currentSize, onSaveFontSize }) => {
  const [size, setSize] = useState(currentSize);

  useEffect(() => {
    setSize(currentSize);
  }, [currentSize, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    const newSize = parseInt(size, 10);
    if (!isNaN(newSize) && newSize > 0) {
      onSaveFontSize(newSize);
      onClose();
    } else {
      // Optionally, show an error message for invalid input
      alert(HEBREW_TEXT.fontSizeModal?.invalidSizeError || "Invalid font size. Please enter a positive number.");
    }
  };

  const handleInputChange = (e) => {
    setSize(e.target.value);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content font-size-modal">
        <h2>{HEBREW_TEXT.fontSizeModal?.title || "Set Font Size"}</h2>
        <div className="modal-body">
          <label htmlFor="font-size-input">{HEBREW_TEXT.fontSizeModal?.label || "Font Size (px):"}</label>
          <input
            type="number"
            id="font-size-input"
            value={size}
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

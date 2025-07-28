// frontend/src/components/CreateFolderModal.jsx
import React, { useState, useEffect } from 'react';
import './Modal.css'; // נשתמש בסגנונות הכלליים של מודל

const CreateFolderModal = ({ isOpen, onClose, onCreateFolder, parentFolderName }) => {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedName = folderName.trim();
    
    if (!trimmedName) {
      setError('נא הזן שם תיקייה');
      return;
    }
    
    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      setError("שם תיקייה אינו יכול לכלול '/' או '\\'");
      return;
    }
    
    if (trimmedName.length > 255) {
      setError('שם התיקייה ארוך מדי');
      return;
    }
    
    onCreateFolder(trimmedName);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content create-folder-modal">
        <div className="modal-header">
          <h2>יצירת תיקייה חדשה</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="folderName">
                שם התיקייה החדשה{parentFolderName && ` (בתוך ${parentFolderName})`}:
              </label>
              <input
                id="folderName"
                type="text"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setError('');
                }}
                placeholder="הזן שם תיקייה"
                className="form-input"
                autoFocus
              />
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              onClick={onClose} 
              className="modal-btn modal-btn-secondary"
            >
              ביטול
            </button>
            <button 
              type="submit" 
              className="modal-btn modal-btn-primary"
              disabled={!folderName.trim()}
            >
              צור תיקייה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;

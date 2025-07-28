// frontend/src/components/ConfirmDeleteModal.jsx
import React from 'react';
import './Modal.css'; // נשתמש בסגנונות הכלליים של מודל

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, itemName, itemType }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const itemTypeDisplay = itemType === 'folder' ? 'התיקייה' : 'הקובץ';

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content confirm-delete-modal">
        <div className="modal-header">
          <h2>אישור מחיקה</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="confirm-delete-message">
            <p>
              האם אתה בטוח שברצונך למחוק את {itemTypeDisplay} 
              <strong> "{itemName}"</strong>?
            </p>
            <p className="warning-text">
              פעולה זו אינה הפיכה ותמחק את הקובץ/תיקייה לצמיתות.
            </p>
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
            type="button" 
            onClick={handleConfirm} 
            className="modal-btn modal-btn-danger"
          >
            מחק
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;

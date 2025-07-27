// frontend/src/components/UnsavedChangesModal.jsx
import React from 'react';
import './UnsavedChangesModal.css';

const UnsavedChangesModal = ({ 
  isOpen, 
  fileName, 
  onSave, 
  onDiscard, 
  onCancel,
  isSaving = false 
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onSave();
    }
  };

  return (
    <div className="unsaved-changes-modal-overlay" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="unsaved-changes-modal">
        <div className="unsaved-changes-modal-header">
          <span className="unsaved-changes-modal-icon">⚠️</span>
          <h3 className="unsaved-changes-modal-title">שינויים לא נשמרו</h3>
        </div>
        
        <div className="unsaved-changes-modal-message">
          הקובץ <span className="unsaved-changes-modal-filename">'{fileName}'</span> מכיל שינויים שלא נשמרו.
          <br />
          מה תרצה לעשות?
        </div>
        
        <div className="unsaved-changes-modal-buttons">
          <button 
            className="unsaved-changes-modal-button cancel"
            onClick={onCancel}
            disabled={isSaving}
            title="ביטול - חזור לעריכה"
          >
            ביטול
          </button>
          
          <button 
            className="unsaved-changes-modal-button discard"
            onClick={onDiscard}
            disabled={isSaving}
            title="סגור בלי לשמור - השינויים יאבדו"
          >
            סגור בלי שמירה
          </button>
          
          <button 
            className="unsaved-changes-modal-button save"
            onClick={onSave}
            disabled={isSaving}
            title="שמור את השינויים ואז סגור"
          >
            {isSaving ? 'שומר...' : 'שמור וסגור'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;

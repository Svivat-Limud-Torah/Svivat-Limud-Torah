// frontend/src/components/NewFileModal.jsx
import React, { useState, useEffect } from 'react';
import './NewFileModal.css';

const NewFileModal = ({ 
  isOpen, 
  onClose, 
  onCreateFile, 
  workspaceFolders, 
  defaultLocation = null,
  mode = 'create', // 'create' or 'save'
  initialFileName = '',
  initialExtension = 'md',
  preselectedPath = null
}) => {
  const [fileName, setFileName] = useState('');
  const [fileExtension, setFileExtension] = useState('md');
  const [selectedCustomPath, setSelectedCustomPath] = useState('');
  const [isSelectingPath, setIsSelectingPath] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFileName(initialFileName || '');
      setFileExtension(initialExtension || 'md');
      setSelectedCustomPath(preselectedPath || '');
      setIsSelectingPath(false);
    }
  }, [isOpen, initialFileName, initialExtension, preselectedPath]);

  // Function to open file explorer and select directory
  const handleSelectDirectory = async () => {
    setIsSelectingPath(true);
    try {
      // Check if electronAPI is available (running in Electron)
      if (window.electronAPI && window.electronAPI.showDirectoryPicker) {
        const result = await window.electronAPI.showDirectoryPicker();
        if (result && !result.canceled && result.filePaths.length > 0) {
          setSelectedCustomPath(result.filePaths[0]);
        }
      } else {
        // Fallback for development mode (running in browser)
        const path = prompt('הזן את נתיב התיקייה המלא:');
        if (path && path.trim()) {
          setSelectedCustomPath(path.trim());
        }
      }
    } catch (error) {
      console.error('Error opening directory picker:', error);
      // Fallback to manual input
      const path = prompt('הזן את נתיב התיקייה המלא:');
      if (path && path.trim()) {
        setSelectedCustomPath(path.trim());
      }
    } finally {
      setIsSelectingPath(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!fileName.trim()) {
      alert('נא הזן שם קובץ');
      return;
    }

    if (fileName.includes('/') || fileName.includes('\\')) {
      alert("שם קובץ אינו יכול לכלול '/' או '\\'.");
      return;
    }

    if (!selectedCustomPath) {
      alert('נא בחר מיקום לקובץ');
      return;
    }

    const fullFileName = `${fileName.trim()}.${fileExtension}`;
    
    onCreateFile(selectedCustomPath, fullFileName);
    onClose();
  };

  const commonExtensions = [
    { value: 'md', label: 'Markdown (.md) - מומלץ - מאפשר יכולות עיצוב' },
    { value: 'txt', label: 'טקסט רגיל (.txt)' },
    { value: 'docx', label: 'מסמך Word (.docx)' },
    { value: 'pdf', label: 'PDF (.pdf)' },
  ];

  if (!isOpen) return null;

  return (
    <div className="new-file-modal-overlay">
      <div className="new-file-modal">
        <div className="new-file-modal-header">
          <h3>{mode === 'save' ? 'שמור קובץ בשם' : 'צור קובץ חדש'}</h3>
          <button 
            className="new-file-modal-close" 
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="new-file-modal-form">
          <div className="form-group">
            <label htmlFor="fileName">שם הקובץ:</label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="הזן שם קובץ..."
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fileExtension">סוג קובץ:</label>
            <select
              id="fileExtension"
              value={fileExtension}
              onChange={(e) => setFileExtension(e.target.value)}
            >
              {commonExtensions.map(ext => (
                <option key={ext.value} value={ext.value}>
                  {ext.label}
                </option>
              ))}
            </select>
            <div className="file-type-note">
              <small>
                <strong>הערה:</strong> Markdown (.md) הוא הפורמט המומלץ מכיוון שהוא מאפשר עיצוב טקסט מתקדם
              </small>
            </div>
          </div>

          <div className="form-group">
            <label>מיקום הקובץ:</label>
            
            <div className="directory-selection">
              <button
                type="button"
                onClick={handleSelectDirectory}
                disabled={isSelectingPath}
                className="select-directory-btn"
              >
                {isSelectingPath ? 'בוחר תיקייה...' : 'בחר תיקייה'}
              </button>
              
              {selectedCustomPath && (
                <div className="selected-path">
                  <label>תיקייה נבחרת:</label>
                  <div className="path-display">{selectedCustomPath}</div>
                </div>
              )}
            </div>
          </div>

          <div className="new-file-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              ביטול
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!selectedCustomPath || !fileName.trim()}
            >
              {mode === 'save' ? 'שמור קובץ' : 'צור קובץ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewFileModal;

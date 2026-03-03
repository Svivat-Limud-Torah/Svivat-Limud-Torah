// frontend/src/components/SingleFileConversionModal.jsx
import React, { useState, useRef } from 'react';
import './SettingsModal.css'; // Reuse existing modal styles
import LocalFileSystemService from '../services/LocalFileSystemService';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://localhost:3001';

const SingleFileConversionModal = ({ isOpen, onClose, filePath, fileName, onSuccess, basePath, relativePath }) => {
  const [selectedFormat, setSelectedFormat] = useState('md');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');
  const [conversionResult, setConversionResult] = useState(null);

  // Available conversion formats
  const conversionFormats = [
    { 
      value: 'md', 
      label: 'Markdown (.md) - מומלץ', 
      description: 'פורמט טקסט עם יכולות עיצוב ותמיכה מלאה ב-Torah IDE',
      icon: ''
    },
    { 
      value: 'txt', 
      label: 'טקסט רגיל (.txt)', 
      description: 'קובץ טקסט פשוט ללא עיצוב',
      icon: ''
    },
    { 
      value: 'html', 
      label: 'HTML (.html)', 
      description: 'דף אינטרנט עם עיצוב מלא',
      icon: ''
    }
  ];

  const handleConvert = async () => {
    if (!basePath || !relativePath) {
      setError('נתיב קובץ חסר');
      return;
    }

    setIsConverting(true);
    setError('');
    setConversionResult(null);

    try {
      // Read the file content using LocalFileSystemService
      const fileResult = await LocalFileSystemService.readFile(basePath, relativePath);
      
      if (!fileResult.success) {
        throw new Error(fileResult.error || 'Failed to read file');
      }

      // Get file extension
      const fileExtension = fileName.split('.').pop().toLowerCase();

      // Send file content and metadata to backend for conversion
      const response = await fetch(`${API_BASE_URL}/api/file-conversion/convert-file-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          fileContent: fileResult.content,
          sourceFormat: fileExtension,
          targetFormat: selectedFormat
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה בהמרת הקובץ');
      }

      const result = await response.json();
      
      // Write the converted file back using LocalFileSystemService
      const newFileName = fileName.replace(/\.[^/.]+$/, `.${selectedFormat}`);
      const newRelativePath = relativePath.replace(/[^/]+$/, newFileName);
      
      const writeResult = await LocalFileSystemService.writeFile(basePath, newRelativePath, result.convertedContent);
      
      if (!writeResult.success) {
        throw new Error('Failed to save converted file');
      }

      setConversionResult({
        ...result,
        newFilePath: `${basePath}::${newRelativePath}`,
        newFileName: newFileName
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess({
          newFilePath: `${basePath}::${newRelativePath}`,
          newFileName: newFileName
        });
      }

    } catch (error) {
      console.error('Conversion error:', error);
      setError(error.message || 'שגיאה לא צפויה בהמרת הקובץ');
    } finally {
      setIsConverting(false);
    }
  };

  const handleClose = () => {
    if (!isConverting) {
      setError('');
      setConversionResult(null);
      setSelectedFormat('md');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal" style={{ maxWidth: '600px' }}>
        <div className="settings-modal-header">
          <h2>המרת קובץ - {fileName}</h2>
          <button 
            className="settings-modal-close" 
            onClick={handleClose}
            disabled={isConverting}
          >
            ×
          </button>
        </div>

        <div className="settings-modal-content">
          {!conversionResult && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--theme-bg-tertiary)', 
                  border: '1px solid var(--theme-border-color)', 
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}>
                  <div style={{ fontSize: '14px', color: 'var(--theme-text-secondary)' }}>
                    <strong>קבצים נתמכים:</strong> TXT, DOCX, PDF, HTML, RTF, MD
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--theme-text-tertiary)', marginTop: '4px' }}>
                    הקובץ המקורי לא יימחק - יווצר קובץ חדש עם הפורמט הנבחר
                  </div>
                </div>
                
                <p style={{ color: 'var(--theme-text-secondary)', marginBottom: '15px' }}>
                  בחר את הפורמט שאליו תרצה להמיר את הקובץ:
                </p>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  {conversionFormats.map((format) => (
                    <label
                      key={format.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '15px',
                        border: selectedFormat === format.value 
                          ? '2px solid var(--theme-accent-primary)' 
                          : '1px solid var(--theme-border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedFormat === format.value 
                          ? 'var(--theme-hover-bg)' 
                          : 'var(--theme-bg-secondary)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedFormat !== format.value) {
                          e.target.style.backgroundColor = 'var(--theme-hover-bg)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFormat !== format.value) {
                          e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="conversionFormat"
                        value={format.value}
                        checked={selectedFormat === format.value}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        style={{ marginLeft: '12px', marginTop: '2px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: 'var(--theme-text-primary)',
                          marginBottom: '4px'
                        }}>
                          {format.icon} {format.label}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          color: 'var(--theme-text-secondary)',
                          lineHeight: '1.4'
                        }}>
                          {format.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid var(--theme-error-color)',
                  borderRadius: '6px',
                  color: 'var(--theme-error-color)',
                  marginBottom: '20px'
                }}>
                  <strong>שגיאה:</strong> {error}
                </div>
              )}

              <div className="settings-modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={handleClose}
                  disabled={isConverting}
                >
                  ביטול
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleConvert}
                  disabled={isConverting}
                >
                  {isConverting ? 'ממיר...' : `המר ל-${selectedFormat.toUpperCase()}`}
                </button>
              </div>
            </>
          )}

          {conversionResult && (
            <div>
              <div style={{
                padding: '15px',
                backgroundColor: 'rgba(63, 185, 80, 0.1)',
                border: '1px solid var(--theme-success-color)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '24px', marginLeft: '8px' }}>✅</span>
                  <strong style={{ color: 'var(--theme-success-color)' }}>ההמרה הושלמה בהצלחה!</strong>
                </div>
                <div style={{ color: 'var(--theme-text-secondary)', fontSize: '14px' }}>
                  <div><strong>קובץ מקור:</strong> {conversionResult.originalFile}</div>
                  <div><strong>קובץ חדש:</strong> {conversionResult.convertedFile}</div>
                  <div><strong>פורמט:</strong> {conversionResult.targetFormat.toUpperCase()}</div>
                </div>
              </div>

              <div className="settings-modal-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={handleClose}
                >
                  סגור
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SingleFileConversionModal;

// frontend/src/components/FileConversionModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import './FileConversionModal.css';
import { HEBREW_TEXT, API_BASE_URL, IS_WEB_MODE } from '../utils/constants';

const FileConversionModal = ({ isOpen, onClose, addWorkspaceFolder }) => {
    const [currentStep, setCurrentStep] = useState('welcome'); // 'welcome', 'converting', 'results'
    const [selectedFolder, setSelectedFolder] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState(null);
    const [conversionResults, setConversionResults] = useState(null);
    const [error, setError] = useState('');
    const [folderAdded, setFolderAdded] = useState(false);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const fileInputRef = useRef(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setCurrentStep('converting'); // Skip welcome step — guided tour handles onboarding
            setSelectedFolder('');
            setIsConverting(false);
            setConversionProgress(null);
            setConversionResults(null);
            setError('');
            setFolderAdded(false);
            setIsAddingFolder(false);
        }
    }, [isOpen]);

    const handleFolderSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFolderChange = (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            // Get the folder path from the first file
            const firstFile = files[0];
            // For webkitRelativePath, we need to reconstruct the folder path
            const relativePath = firstFile.webkitRelativePath;
            const folderName = relativePath.split('/')[0];
            
            // Try to get the actual path if available (only works in some browsers)
            if (firstFile.path) {
                const fullPath = firstFile.path.replace('/' + firstFile.name, '').replace('\\' + firstFile.name, '');
                setSelectedFolder(fullPath);
            } else {
                // Fallback: ask user to manually enter the full path
                const userPath = prompt(`נא הכנס את הנתיב המלא לתיקייה "${folderName}":`);
                if (userPath) {
                    setSelectedFolder(userPath.trim());
                }
            }
        }
    };

    const handleWelcomeClose = () => {
        // Closing welcome = never show again on this browser
        onClose('never');
    };

    const handleStartConversion = () => {
        setCurrentStep('converting');
    };

    const handleConvert = async () => {
        if (!selectedFolder.trim()) {
            setError('אנא בחר תיקייה להמרה');
            return;
        }

        setIsConverting(true);
        setError('');
        setConversionProgress({ type: 'start' });
        setConversionResults(null);

        try {
            const response = await fetch(`${API_BASE_URL}/file-conversion/convert-directory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceDirectory: selectedFolder.trim(),
                    targetDirectoryName: 'סביבת לימוד תורה'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'שגיאה בהמרת הקבצים');
            }

            const result = await response.json();

            // Stop spinner BEFORE showing results or opening folder picker
            setIsConverting(false);
            setConversionProgress({ type: 'complete' });
            setConversionResults(result);
            setCurrentStep('results');

            localStorage.setItem('hasCompletedFileConversion', 'true');

        } catch (error) {
            console.error('Conversion error:', error);
            setError(error.message || 'שגיאה לא צפויה בהמרת הקבצים');
            setIsConverting(false);
        }
    };

    const handleClose = () => {
        if (!isConverting) {
            // If we're closing from results page (successful conversion), clear all restrictions
            if (currentStep === 'results') {
                onClose('success');
            } else {
                onClose('postpone');
            }
        }
    };

    const handleBackToWelcome = () => {
        setCurrentStep('welcome');
        setSelectedFolder('');
        setError('');
        setConversionProgress(null);
        setConversionResults(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fcm-overlay" onClick={e => e.target === e.currentTarget && !isConverting && handleClose()}>
            <div className="fcm-modal">

                {/* Header */}
                <div className="fcm-header">
                    <div className="fcm-header-title">
                        <span className="fcm-header-icon">📄</span>
                        <h2>{currentStep === 'results' ? 'תוצאות ההמרה' : 'המרת קבצים ל-Markdown'}</h2>
                    </div>
                    {!isConverting && (
                        <button className="fcm-close-btn" onClick={handleClose} aria-label="סגור">✕</button>
                    )}
                </div>

                <div className="fcm-body">

                    {/* ── Converting step ── */}
                    {currentStep === 'converting' && (
                        <div className="fcm-converting">

                            {/* Why convert banner */}
                            <div className="fcm-why-banner">
                                <div className="fcm-why-icon">💡</div>
                                <div className="fcm-why-text">
                                    <strong>למה להמיר לקבצי Markdown?</strong>
                                    <p>
                                        קבצי <code>.md</code> מאפשרים עריכה נוחה של כותרות, רשימות, טבלאות ועיצוב טקסט —
                                        בדיוק כמו Word, אבל קלים ומהירים יותר לניהול סיכומים ולמידה.
                                        הכלים החכמים של התוכנה (כרטיסיות, ניתוח AI, חיפוש) עובדים הכי טוב עם קבצי MD.
                                    </p>
                                </div>
                            </div>

                            {/* Supported formats */}
                            <div className="fcm-formats" dir="ltr">
                                <span className="fcm-format-badge">DOCX</span>
                                <span className="fcm-format-badge">PDF</span>
                                <span className="fcm-format-badge">TXT</span>
                                <span className="fcm-format-badge">HTML</span>
                                <span className="fcm-format-badge">RTF</span>
                                <span className="fcm-format-arrow">→</span>
                                <span className="fcm-format-badge fcm-format-target">MD</span>
                            </div>

                            <div className="fcm-safe-note">
                                🔒 הקבצים המקוריים <strong>לא יימחקו</strong> — תיווצר תיקייה חדשה עם הגרסאות המומרות.
                            </div>

                            {/* Folder selection */}
                            <div className="fcm-folder-section">
                                <label className="fcm-label">בחר את התיקייה שברצונך להמיר:</label>
                                <div className="fcm-folder-row">
                                    <input
                                        type="text"
                                        value={selectedFolder}
                                        onChange={(e) => setSelectedFolder(e.target.value)}
                                        placeholder="C:\Users\שם\Documents\סיכומים"
                                        className="fcm-path-input"
                                        disabled={isConverting}
                                        dir="ltr"
                                    />
                                    <button
                                        onClick={handleFolderSelect}
                                        className="fcm-browse-btn"
                                        disabled={isConverting}
                                    >
                                        עיון…
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={handleFolderChange}
                                />
                            </div>

                            {error && (
                                <div className="fcm-error">⚠️ {error}</div>
                            )}

                            {conversionProgress && conversionProgress.type === 'start' && (
                                <div className="fcm-progress">
                                    <span>ממיר קבצים…</span>
                                    <div className="fcm-progress-bar">
                                        <div className="fcm-progress-fill fcm-indeterminate"></div>
                                    </div>
                                </div>
                            )}

                            <div className="fcm-actions">
                                <button
                                    onClick={handleConvert}
                                    disabled={!selectedFolder.trim() || isConverting}
                                    className="fcm-btn-primary"
                                >
                                    {isConverting ? '⏳ ממיר…' : '▶ התחל המרה'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Results step ── */}
                    {currentStep === 'results' && conversionResults && (
                        <div className="fcm-results">
                            <div className="fcm-results-success">✅ ההמרה הושלמה בהצלחה!</div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--theme-text-secondary)', marginBottom: 16 }}>
                        לחץ על הכפתור מטה כדי להוסיף את התיקייה המומרת לסייר הקבצים.
                    </p>

                            <div className="fcm-results-grid">
                                <div className="fcm-stat">
                                    <span className="fcm-stat-num">{conversionResults.totalFiles}</span>
                                    <span className="fcm-stat-label">קבצים נמצאו</span>
                                </div>
                                <div className="fcm-stat">
                                    <span className="fcm-stat-num fcm-green">{conversionResults.convertedFiles}</span>
                                    <span className="fcm-stat-label">הומרו</span>
                                </div>
                                {conversionResults.copiedFiles > 0 && (
                                    <div className="fcm-stat">
                                        <span className="fcm-stat-num">{conversionResults.copiedFiles}</span>
                                        <span className="fcm-stat-label">הועתקו</span>
                                    </div>
                                )}
                                {conversionResults.failed?.length > 0 && (
                                    <div className="fcm-stat">
                                        <span className="fcm-stat-num fcm-red">{conversionResults.failed.length}</span>
                                        <span className="fcm-stat-label">נכשלו</span>
                                    </div>
                                )}
                            </div>

                            <div className="fcm-results-dir">
                                📁 תיקייה חדשה: <code>{conversionResults.targetDirectory}</code>
                            </div>

                            {conversionResults.failed?.length > 0 && (
                                <details className="fcm-failures">
                                    <summary>קבצים שנכשלו ({conversionResults.failed.length})</summary>
                                    <ul>
                                        {conversionResults.failed.map((f, i) => (
                                            <li key={i}><strong>{f.path}</strong>: {f.error}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}

                            <div className="fcm-actions" style={{ flexDirection: 'column', gap: 10 }}>
                                {!folderAdded ? (
                                    <button
                                        onClick={async () => {
                                            if (!addWorkspaceFolder) return;
                                            setIsAddingFolder(true);
                                            const ok = await addWorkspaceFolder();
                                            setIsAddingFolder(false);
                                            if (ok) {
                                                setFolderAdded(true);
                                                onClose('success');
                                            }
                                        }}
                                        className="fcm-btn-primary"
                                        disabled={isAddingFolder}
                                    >
                                        {isAddingFolder ? '⏳ מוסיף…' : '📂 פתח תיקייה בסייר הקבצים'}
                                    </button>
                                ) : (
                                    <button onClick={handleClose} className="fcm-btn-primary">סגור</button>
                                )}
                                <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>אעשה זאת אחר כך</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileConversionModal;

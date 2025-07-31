// frontend/src/components/FileConversionModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import './FileConversionModal.css';
import { HEBREW_TEXT, API_BASE_URL } from '../utils/constants';

const FileConversionModal = ({ isOpen, onClose, addWorkspaceFolder }) => {
    const [currentStep, setCurrentStep] = useState('welcome'); // 'welcome', 'converting', 'results'
    const [selectedFolder, setSelectedFolder] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState(null);
    const [conversionResults, setConversionResults] = useState(null);
    const [error, setError] = useState('');
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const fileInputRef = useRef(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setCurrentStep('welcome');
            setSelectedFolder('');
            setIsConverting(false);
            setConversionProgress(null);
            setConversionResults(null);
            setError('');
            setDontShowAgain(false);
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
        if (dontShowAgain) {
            onClose('never');
        } else {
            onClose('postpone');
        }
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
            setConversionResults(result);
            setConversionProgress({ type: 'complete' });
            setCurrentStep('results');

            // Add the new target directory to workspace automatically
            if (result.targetDirectory && addWorkspaceFolder) {
                try {
                    const addedSuccessfully = await addWorkspaceFolder(result.targetDirectory);
                    if (addedSuccessfully) {
                        // Mark that user has completed file conversion to avoid showing welcome modal again
                        localStorage.setItem('hasCompletedFileConversion', 'true');
                        
                        // Ask user to restart the application for changes to take effect
                        const shouldRestart = window.confirm(
                            'התיקייה החדשה נוספה לסביבת העבודה בהצלחה!\n\n' +
                            'כדי שהשינויים ייכנסו לתוקף מומלץ לאתחל את התוכנה.\n\n' +
                            'האם תרצה לאתחל כעת?'
                        );
                        
                        if (shouldRestart) {
                            // Close the application to restart
                            if (window.electronAPI && window.electronAPI.closeApp) {
                                window.electronAPI.closeApp();
                            } else {
                                // Fallback for web version - reload the page
                                window.location.reload();
                            }
                        }
                    } else {
                        console.log('Folder was not added - it might already exist in workspace');
                    }
                } catch (folderError) {
                    console.warn('Error adding folder to workspace:', folderError);
                    // Don't break the conversion success flow for this
                }
            }

        } catch (error) {
            console.error('Conversion error:', error);
            setError(error.message || 'שגיאה לא צפויה בהמרת הקבצים');
        } finally {
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
        <div className="file-conversion-modal-overlay">
            <div className="file-conversion-modal">
                <div className="file-conversion-modal-header">
                    <h2>
                        {currentStep === 'welcome' && 'ברוכים הבאים לסביבת לימוד תורה!'}
                        {currentStep === 'converting' && 'המרת קבצים'}
                        {currentStep === 'results' && 'תוצאות ההמרה'}
                    </h2>
                    {!isConverting && (
                        <button 
                            className="file-conversion-modal-close" 
                            onClick={currentStep === 'welcome' ? handleWelcomeClose : handleClose}
                            aria-label="סגור"
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="file-conversion-modal-content">
                    {currentStep === 'welcome' && (
                        <div className="welcome-step">
                            <div className="welcome-message">
                                <p className="welcome-intro">
                                    שמחים שבחרת להשתמש בסביבת לימוד תורה החדשה שלנו! 
                                </p>
                                <p>
                                    כדי שתוכל ליהנות מכל היכולות המתקדמות של התוכנה, 
                                    אנחנו מציעים לך להמיר את הסיכומים והקבצים הקיימים שלך לפורמט המותאם של התוכנה.
                                </p>
                                <div className="benefits-list">
                                    <h4>היתרונות של ההמרה:</h4>
                                    <ul>
                                        <li>עבודה מהירה ונוחה יותר עם הקבצים</li>
                                        <li>יכולות חיפוש מתקדמות</li>
                                        <li>תמיכה מלאה בכל התכונות החכמות של התוכנה</li>
                                        <li>ארגון טוב יותר של החומרים</li>
                                    </ul>
                                </div>
                                <div className="safety-notice">
                                    <p><strong>חשוב לדעת:</strong> הקבצים המקוריים שלך לא יימחקו!</p>
                                    <p>ייווצר עותק חדש בתיקייה נפרדת עם הקבצים המומרים.</p>
                                </div>
                            </div>
                            
                            <div className="welcome-actions">
                                <button 
                                    onClick={handleStartConversion}
                                    className="btn btn-primary welcome-convert-button"
                                >
                                    כן, אני רוצה להמיר את הקבצים שלי
                                </button>
                                <button 
                                    onClick={handleWelcomeClose}
                                    className="btn welcome-skip-button"
                                >
                                    לא, אני אעשה זאת מאוחר יותר
                                </button>
                            </div>
                            
                            <div className="dont-show-again">
                                <label>
                                    <input 
                                        type="checkbox" 
                                        checked={dontShowAgain}
                                        onChange={(e) => setDontShowAgain(e.target.checked)}
                                    />
                                    לא להציג הודעה זו שוב
                                </label>
                            </div>
                        </div>
                    )}

                    {currentStep === 'converting' && (
                        <div className="converting-step">
                            <div className="file-conversion-explanation">
                                <p>התוכנה תמיר קבצים מהסוגים הבאים: TXT, DOCX, PDF, HTML, RTF</p>
                                <p style={{ fontWeight: 'bold', color: '#2c5282' }}>
                                    הקבצים המקוריים שלך לא יימחקו! יתיצרה תיקייה חדשה עם הקבצים המומרים.
                                </p>
                            </div>

                            <div className="file-conversion-folder-selection">
                                <label htmlFor="folder-input">בחר תיקייה להמרה:</label>
                                <div className="folder-input-group">
                                    <input
                                        type="text"
                                        value={selectedFolder}
                                        onChange={(e) => setSelectedFolder(e.target.value)}
                                        placeholder="הכנס נתיב תיקייה או לחץ על 'עיון' לבחירה"
                                        className="folder-path-input"
                                        disabled={isConverting}
                                    />
                                    <button 
                                        onClick={handleFolderSelect}
                                        className="folder-browse-button"
                                        disabled={isConverting}
                                    >
                                        עיון...
                                    </button>
                                </div>
                                
                                {/* Hidden file input for folder selection */}
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
                                <div className="file-conversion-error">
                                    <strong>שגיאה:</strong> {error}
                                </div>
                            )}

                            {conversionProgress && conversionProgress.type === 'start' && (
                                <div className="file-conversion-progress">
                                    <p>מבצע המרה...</p>
                                    <div className="progress-bar">
                                        <div className="progress-bar-fill indeterminate"></div>
                                    </div>
                                </div>
                            )}

                            <div className="file-conversion-actions">
                                <button 
                                    onClick={handleConvert}
                                    disabled={!selectedFolder.trim() || isConverting}
                                    className="btn btn-primary convert-button"
                                >
                                    {isConverting ? 'מבצע המרה...' : 'התחל המרה'}
                                </button>
                                <button 
                                    onClick={handleBackToWelcome}
                                    disabled={isConverting}
                                    className="btn cancel-button"
                                >
                                    חזור
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 'results' && conversionResults && (
                        <div className="results-step">
                            <div className="file-conversion-results">
                                <h3>ההמרה הושלמה!</h3>
                                <div className="conversion-summary">
                                    <p>
                                        <strong>סה"כ קבצים שנמצאו:</strong> {conversionResults.totalFiles}
                                    </p>
                                    <p>
                                        <strong>קבצים שהומרו בהצלחה:</strong> {conversionResults.convertedFiles}
                                    </p>
                                    {conversionResults.copiedFiles && conversionResults.copiedFiles > 0 && (
                                        <p>
                                            <strong>קבצים שהועתקו (תמונות ואחרים):</strong> {conversionResults.copiedFiles}
                                        </p>
                                    )}
                                    {conversionResults.failed && conversionResults.failed.length > 0 && (
                                        <p>
                                            <strong>קבצים שנכשלו:</strong> {conversionResults.failed.length}
                                        </p>
                                    )}
                                    <p>
                                        <strong>התיקייה החדשה נוצרה:</strong> {conversionResults.targetDirectory}
                                    </p>
                                </div>

                                {conversionResults.failed && conversionResults.failed.length > 0 && (
                                    <div className="conversion-failures">
                                        <h4>קבצים שנכשלו:</h4>
                                        <ul>
                                            {conversionResults.failed.map((failure, index) => (
                                                <li key={index}>
                                                    <strong>{failure.path}:</strong> {failure.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="conversion-success-message">
                                    <p style={{ color: '#28a745', fontWeight: 'bold' }}>
                                        מעולה! התיקייה החדשה "סביבת לימוד תורה" נוצרה והוספה 
                                        לסביבת העבודה שלך.
                                    </p>
                                    <p>
                                        כעת תוכל להתחיל לעבוד עם הקבצים המומרים בסביבת העבודה החדשה.
                                        כל התמונות והקבצים האחרים הועתקו כמו שהם כדי לשמור על המבנה המקורי.
                                    </p>
                                    <p>
                                        אתה יכול להגיע לאפשרות המרת קבצים בכל עת דרך ההגדרות.
                                    </p>
                                </div>

                                <div className="file-conversion-actions">
                                    <button 
                                        onClick={handleClose}
                                        className="btn btn-primary"
                                    >
                                        הבנתי, תודה!
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileConversionModal;

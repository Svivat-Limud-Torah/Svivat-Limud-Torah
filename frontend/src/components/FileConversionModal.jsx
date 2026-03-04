import React, { useState, useRef, useEffect } from 'react';
import './FileConversionModal.css';
import { HEBREW_TEXT, API_BASE_URL, IS_WEB_MODE } from '../utils/constants';
import { convertFileContent } from '../services/FileConversionWebService';

const FileConversionModal = ({ isOpen, onClose, addWorkspaceFolder, addWorkspaceFolderFromHandle }) => {
    const [currentStep, setCurrentStep] = useState('welcome'); // 'welcome', 'converting', 'results'
    const [selectedFolder, setSelectedFolder] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState(null);
    const [conversionResults, setConversionResults] = useState(null);
    const [error, setError] = useState('');
    const [folderAdded, setFolderAdded] = useState(false);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [webConvertedFiles, setWebConvertedFiles] = useState([]);
    const [isSavingToFolder, setIsSavingToFolder] = useState(false);
    const [saveFolderError, setSaveFolderError] = useState('');
    const fileInputRef = useRef(null);
    const webFilesRef = useRef([]);

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
            setWebConvertedFiles([]);
            setIsSavingToFolder(false);
            setSaveFolderError('');
            webFilesRef.current = [];
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
            const firstFile = files[0];
            const relativePath = firstFile.webkitRelativePath;
            const folderName = relativePath.split('/')[0];

            if (IS_WEB_MODE) {
                // In web mode, store the File objects for client-side conversion
                webFilesRef.current = Array.from(files);
                setSelectedFolder(folderName);
            } else {
                // Try to get the actual path if available (only works in Electron)
                if (firstFile.path) {
                    const fullPath = firstFile.path.replace('/' + firstFile.name, '').replace('\\' + firstFile.name, '');
                    setSelectedFolder(fullPath);
                } else {
                    const userPath = prompt(`נא הכנס את הנתיב המלא לתיקייה "${folderName}":`);
                    if (userPath) {
                        setSelectedFolder(userPath.trim());
                    }
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
            if (IS_WEB_MODE) {
                // Client-side conversion
                const CONVERTIBLE = new Set(['docx', 'pdf', 'html', 'htm', 'rtf', 'txt']);
                const files = webFilesRef.current;
                let converted = 0, failed = [], copiedCount = 0;
                const convertedFiles = [];

                for (const file of files) {
                    const ext = file.name.split('.').pop().toLowerCase();
                    if (CONVERTIBLE.has(ext)) {
                        try {
                            const arrayBuffer = await file.arrayBuffer();
                            const result = await convertFileContent(file.name, arrayBuffer, ext, 'md');
                            const newName = file.name.replace(/\.[^/.]+$/, '.md');
                            convertedFiles.push({ name: file.webkitRelativePath?.replace(/[^/]+\//, '') || newName, content: result.convertedContent });
                            converted++;
                        } catch (err) {
                            failed.push({ path: file.webkitRelativePath || file.name, error: err.message });
                        }
                    } else if (ext === 'md') {
                        // Already MD — include as-is
                        const text = await file.text();
                        convertedFiles.push({ name: file.webkitRelativePath?.replace(/[^/]+\//, '') || file.name, content: text });
                        copiedCount++;
                    }
                }

                // Write converted files to OPFS and register as workspace folder
                const folderName = (selectedFolder || 'קבצים') + ' (מומר)';
                let autoAdded = false;
                try {
                    const opfsRoot = await navigator.storage.getDirectory();
                    // Remove previous folder with same name to avoid stale files
                    try { await opfsRoot.removeEntry(folderName, { recursive: true }); } catch (_) { /* didn't exist */ }
                    const convertedFolderHandle = await opfsRoot.getDirectoryHandle(folderName, { create: true });

                    for (const file of convertedFiles) {
                        const parts = file.name.split('/');
                        let currentDir = convertedFolderHandle;
                        for (let i = 0; i < parts.length - 1; i++) {
                            currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
                        }
                        const filename = parts[parts.length - 1];
                        const fileHandle = await currentDir.getFileHandle(filename, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file.content);
                        await writable.close();
                    }

                    if (addWorkspaceFolderFromHandle) {
                        const ok = await addWorkspaceFolderFromHandle(convertedFolderHandle);
                        if (ok) {
                            autoAdded = true;
                            setFolderAdded(true);
                        }
                    }
                } catch (opfsErr) {
                    console.warn('OPFS auto-save failed, falling back to download:', opfsErr);
                }

                setWebConvertedFiles(convertedFiles);
                setIsConverting(false);
                setConversionProgress({ type: 'complete' });
                setConversionResults({
                    totalFiles: files.length,
                    convertedFiles: converted,
                    copiedFiles: copiedCount,
                    failed,
                    targetDirectory: folderName,
                    autoAdded,
                });
                setCurrentStep('results');
                localStorage.setItem('hasCompletedFileConversion', 'true');
            } else {
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

            }
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

    const handleDownloadAll = () => {
        for (const file of webConvertedFiles) {
            const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleSaveToFolder = async () => {
        if (!('showDirectoryPicker' in window)) {
            setSaveFolderError('הדפדפן שלך אינו תומך בשמירה ישירה לתיקייה. נא השתמש ב-Chrome או Edge, או הורד את הקבצים.');
            return;
        }
        if (webConvertedFiles.length === 0) return;

        setIsSavingToFolder(true);
        setSaveFolderError('');

        try {
            // Ask user to pick a destination folder
            const parentHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });

            // Create a subfolder named after the original folder
            const subFolderName = (selectedFolder || 'קבצים מומרים') + ' (מומר)';
            const subDirHandle = await parentHandle.getDirectoryHandle(subFolderName, { create: true });

            // Write all converted files, preserving subfolder structure
            for (const file of webConvertedFiles) {
                const parts = file.name.split('/');
                let currentDir = subDirHandle;
                for (let i = 0; i < parts.length - 1; i++) {
                    currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
                }
                const filename = parts[parts.length - 1];
                const fileHandle = await currentDir.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(file.content);
                await writable.close();
            }

            // Register the new subfolder in the workspace sidebar
            if (addWorkspaceFolderFromHandle) {
                const ok = await addWorkspaceFolderFromHandle(subDirHandle);
                if (ok) {
                    setFolderAdded(true);
                    onClose('success');
                    return;
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                if (err.name === 'NotAllowedError') {
                    setSaveFolderError('הרשאת גישה לתיקייה נדחתה. נא אשר את ההרשאה בחלון שנפתח ונסה שוב.');
                } else {
                    setSaveFolderError('שגיאה בשמירת הקבצים: ' + (err.message || err));
                }
            }
        } finally {
            setIsSavingToFolder(false);
        }
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
                                {IS_WEB_MODE
                                    ? <>🔒 הקבצים המקוריים <strong>לא ישתנו</strong> — התיקייה המומרת תתווסף אוטומטית לסביבת העבודה.</>
                                    : <>🔒 הקבצים המקוריים <strong>לא יימחקו</strong> — תיווצר תיקייה חדשה עם הגרסאות המומרות.</>
                                }
                            </div>

                            {/* Folder selection */}
                            <div className="fcm-folder-section">
                                <label className="fcm-label">בחר את התיקייה שברצונך להמיר:</label>
                                <div className="fcm-folder-row">
                                    <input
                                        type="text"
                                        value={selectedFolder}
                                        onChange={(e) => !IS_WEB_MODE && setSelectedFolder(e.target.value)}
                                        placeholder={IS_WEB_MODE ? "לחץ \'עיון\' לבחירת תיקייה" : "C:\\Users\\שם\\Documents\\סיכומים"}
                                        className="fcm-path-input"
                                        disabled={isConverting}
                                        readOnly={IS_WEB_MODE}
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
                        {IS_WEB_MODE && conversionResults.autoAdded
                            ? 'התיקייה המומרת נוספה אוטומטית לסייר הקבצים.'
                            : 'לחץ על הכפתור מטה כדי להוסיף את התיקייה המומרת לסייר הקבצים.'
                        }
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
                                {IS_WEB_MODE ? (
                                    <>
                                        {conversionResults.autoAdded ? (
                                            <div style={{ textAlign: 'center', color: 'var(--theme-success, #4caf50)', fontWeight: 'bold', marginBottom: 8 }}>
                                                ✅ התיקייה המומרת נוספה לסייר הקבצים
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={handleSaveToFolder}
                                                    className="fcm-btn-primary"
                                                    disabled={webConvertedFiles.length === 0 || isSavingToFolder}
                                                >
                                                    {isSavingToFolder ? '⏳ שומר...' : '📂 שמור תיקייה בסייר הקבצים'}
                                                </button>
                                                {saveFolderError && (
                                                    <div className="fcm-error" style={{ marginTop: 4 }}>⚠️ {saveFolderError}</div>
                                                )}
                                            </>
                                        )}
                                        <button onClick={handleClose} className="fcm-btn-primary">סגור</button>
                                    </>
                                ) : (
                                    <>
                                        {!folderAdded && (
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
                                        )}
                                        <button onClick={handleClose} className="fcm-btn-primary">סגור</button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileConversionModal;

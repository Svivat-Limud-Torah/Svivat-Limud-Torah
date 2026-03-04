// frontend/src/components/ImportExportModal.jsx
import React, { useState, useRef } from 'react';
import { API_BASE_URL, IS_WEB_MODE } from '../utils/constants';
import LocalFileSystemService from '../services/LocalFileSystemService';
import WebApiService from '../services/WebApiService';

const FRONTEND_KEYS = [
  'torah-ide-bookmarks',
  'autoSaveEnabled',
  'selectedAiModel',
  'customAiModels',
  'disable_italic_formatting',
  'fileConversionNeverShow',
  'uploadedFonts',
  'gemini_has_key',
  'gemini_api_key_is_paid',
  'gemini_api_key_val',
  'editorFontSize',
  'presentationFontSize',
  'appFont',
  'editorFont',
];

const FRONTEND_PREFIXES = [
  'torah-ide-annotations-',
  'torah-ide-drawings-',
];

function collectLocalStorageData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (FRONTEND_KEYS.includes(key) || FRONTEND_PREFIXES.some(p => key.startsWith(p))) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

function restoreLocalStorageData(data) {
  if (!data || typeof data !== 'object') return;
  Object.entries(data).forEach(([key, value]) => {
    if (FRONTEND_KEYS.includes(key) || FRONTEND_PREFIXES.some(p => key.startsWith(p))) {
      localStorage.setItem(key, value);
    }
  });
}

// Extract folder names from import bundle
function extractFolderNames(data) {
  // New format: explicit folders list
  if (data.folders && Array.isArray(data.folders) && data.folders.length > 0) {
    return data.folders;
  }
  // Fall back: parse from files_usage paths (format: folderName::relativePath)
  const names = new Set();
  const filesUsage = data.backend?.files_usage || data.files_usage || [];
  for (const entry of filesUsage) {
    const p = entry.absolute_file_path || '';
    if (p.includes('::')) {
      const folderName = p.split('::')[0];
      // Only web-format names (not absolute OS paths)
      if (folderName && !folderName.startsWith('/') && !folderName.match(/^[A-Z]:\\/i)) {
        names.add(folderName);
      }
    }
  }
  return [...names];
}

export default function ImportExportModal({ isOpen, onClose, workspaceFolders = [] }) {
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [isProcessing, setIsProcessing] = useState(false);
  const [foldersToRestore, setFoldersToRestore] = useState([]); // [{name, restored, error}]
  const [restoringFolder, setRestoringFolder] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsProcessing(true);
    setStatus(null);
    try {
      let backendData;
      if (IS_WEB_MODE) {
        backendData = await WebApiService.exportUserData();
      } else {
        const res = await fetch(`${API_BASE_URL}/user/export-data`);
        if (!res.ok) throw new Error('שגיאה בייצוא מהשרת');
        backendData = await res.json();
      }
      const frontendData = collectLocalStorageData();

      const exportBundle = {
        _torahIdeExport: true,
        _version: 2,
        _exportedAt: new Date().toISOString(),
        folders: workspaceFolders.map(wf => wf.name),
        backend: backendData,
        frontend: frontendData,
      };

      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `torah-ide-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'הנתונים יוצאו בהצלחה!' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be selected again
    e.target.value = '';

    setIsProcessing(true);
    setStatus(null);
    setFoldersToRestore([]);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Support both v2 bundle (backend + frontend) and legacy v1 (backend only)
      let backendData, frontendData;
      if (data._torahIdeExport && data.backend) {
        backendData = data.backend;
        frontendData = data.frontend || {};
      } else {
        // Legacy format — entire file is backend data
        backendData = data;
        frontendData = {};
      }

      // Import backend
      if (IS_WEB_MODE) {
        await WebApiService.importUserData(backendData);
      } else {
        const res = await fetch(`${API_BASE_URL}/user/import-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendData),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || 'שגיאה בייבוא לשרת');
        }
      }

      // Import frontend
      restoreLocalStorageData(frontendData);

      // Detect folders needing re-authorization
      const folderNames = extractFolderNames(data);
      if (folderNames.length > 0) {
        setFoldersToRestore(folderNames.map(name => ({ name, restored: false, error: null })));
        setStatus({ type: 'success', message: `הנתונים יובאו בהצלחה! נמצאו ${folderNames.length} תיקיות שדורשות הרשאה מחדש (ראה למטה):` });
      } else {
        setStatus({ type: 'success', message: 'הנתונים יובאו בהצלחה! יש לרענן את הדף כדי לראות את השינויים.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `שגיאה בייבוא: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFolder = async (folderName) => {
    if (!('showDirectoryPicker' in window)) {
      setFoldersToRestore(prev => prev.map(f =>
        f.name === folderName ? { ...f, error: 'הדפדפן אינו תומך ב-File System Access API' } : f
      ));
      return;
    }
    setRestoringFolder(folderName);
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (dirHandle.name !== folderName) {
        setFoldersToRestore(prev => prev.map(f =>
          f.name === folderName
            ? { ...f, error: `שגיאה: התיקייה שנבחרה היא "‏${dirHandle.name}‏" אבל צריך "‏${folderName}‏"` }
            : f
        ));
        return;
      }
      await LocalFileSystemService.saveDirectoryHandle(folderName, dirHandle);
      LocalFileSystemService.directoryHandles.set(folderName, dirHandle);
      setFoldersToRestore(prev => prev.map(f =>
        f.name === folderName ? { ...f, restored: true, error: null } : f
      ));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setFoldersToRestore(prev => prev.map(f =>
          f.name === folderName ? { ...f, error: err.message } : f
        ));
      }
    } finally {
      setRestoringFolder(null);
    }
  };

  const allFoldersRestored = foldersToRestore.length > 0 && foldersToRestore.every(f => f.restored);
  const showReloadButton = status?.type === 'success' && !status.message.includes('יוצאו');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        maxWidth: 460, padding: '28px 32px', direction: 'rtl', textAlign: 'right'
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>יצוא / יבוא נתונים</h2>
        <p style={{ color: 'var(--theme-text-secondary)', margin: '0 0 20px', fontSize: '0.9rem', lineHeight: 1.6 }}>
          ייצא את כל הנתונים שלך לקובץ גיבוי, או ייבא קובץ קיים כדי לשחזר.
          <br />
          כולל: סימניות, הערות, ציורים, שאלון, חזרות, תמונת מצב, גרף לימוד, הגדרות, ומפתח API.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isProcessing}
            style={{ flex: 1 }}
          >
            {isProcessing ? 'מעבד...' : '⬇ ייצוא לקובץ'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            style={{ flex: 1 }}
          >
            {isProcessing ? 'מעבד...' : '⬆ ייבוא מקובץ'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>

        {status && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: foldersToRestore.length > 0 ? 12 : 16,
            fontSize: '0.88rem',
            lineHeight: 1.5,
            backgroundColor: status.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            color: status.type === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${status.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}>
            {status.message}
          </div>
        )}

        {/* Folder re-authorization phase */}
        {foldersToRestore.length > 0 && (
          <div style={{
            marginBottom: 14,
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid rgba(251,191,36,0.35)',
            backgroundColor: 'rgba(251,191,36,0.07)',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>
              בגלל מגבלות בטיחות של הדפדפן, תיקיות מהמחשב דורשות אישור ידני. 
              לחץ על כל תיקייה ובחר אותה מחדש מהדיסק:
            </p>
            {foldersToRestore.map(folder => (
              <div key={folder.name} style={{ marginBottom: 8 }}>
                <button
                  className={`btn ${folder.restored ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => !folder.restored && handleRestoreFolder(folder.name)}
                  disabled={folder.restored || restoringFolder === folder.name}
                  style={{ width: '100%', textAlign: 'right', fontSize: '0.85rem' }}
                >
                  {folder.restored
                    ? `✓ "‏${folder.name}‏" — הוגדרה בהצלחה`
                    : restoringFolder === folder.name
                      ? 'בוחר תיקייה...'
                      : `בחר תיקייה: "‏${folder.name}‏"`}
                </button>
                {folder.error && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#f87171' }}>{folder.error}</p>
                )}
              </div>
            ))}
            {allFoldersRestored && (
              <p style={{ margin: '8px 0 0', fontSize: '0.83rem', color: '#4ade80' }}>
                ✓ כל התיקיות אושרו! עכשיו ניתן לרענן את הדף.
              </p>
            )}
          </div>
        )}

        {showReloadButton && (
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ width: '100%', marginBottom: 10 }}
          >
            רענן דף
          </button>
        )}

        <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
          סגור
        </button>
      </div>
    </div>
  );
}

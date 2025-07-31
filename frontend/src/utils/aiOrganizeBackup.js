// frontend/src/utils/aiOrganizeBackup.js

/**
 * Utility functions for managing AI organization backups
 * These functions help preserve original text for undo functionality
 * even when users switch between preview and edit modes
 */

const BACKUP_EXPIRY_HOURS = 24; // Keep backups for 24 hours
const BACKUP_PREFIX = 'ai_organize_backup_';
const SELECTED_BACKUP_PREFIX = 'ai_organize_selected_backup_';

/**
 * Clean up expired backups from localStorage
 */
export function cleanupExpiredBackups() {
  try {
    const now = Date.now();
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(BACKUP_PREFIX) || key.startsWith(SELECTED_BACKUP_PREFIX))) {
        try {
          const backup = JSON.parse(localStorage.getItem(key));
          if (backup && backup.timestamp) {
            const ageInHours = (now - backup.timestamp) / (1000 * 60 * 60);
            if (ageInHours > BACKUP_EXPIRY_HOURS) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // Remove corrupted backup
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove expired backups
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log(`נוקו ${keysToRemove.length} גיבויי AI ישנים`);
    }
  } catch (error) {
    console.error('שגיאה בניקוי גיבויי AI:', error);
  }
}

/**
 * Remove backup for a specific file
 */
export function removeBackupForFile(fileId) {
  try {
    const fullBackupKey = `${BACKUP_PREFIX}${fileId}`;
    const selectedBackupKey = `${SELECTED_BACKUP_PREFIX}${fileId}`;
    
    localStorage.removeItem(fullBackupKey);
    localStorage.removeItem(selectedBackupKey);
  } catch (error) {
    console.error('שגיאה בהסרת גיבוי עבור קובץ:', error);
  }
}

/**
 * Get backup for a specific file
 */
export function getBackupForFile(fileId) {
  try {
    const fullBackupKey = `${BACKUP_PREFIX}${fileId}`;
    const selectedBackupKey = `${SELECTED_BACKUP_PREFIX}${fileId}`;
    
    const fullBackup = localStorage.getItem(fullBackupKey);
    const selectedBackup = localStorage.getItem(selectedBackupKey);
    
    return {
      full: fullBackup ? JSON.parse(fullBackup) : null,
      selected: selectedBackup ? JSON.parse(selectedBackup) : null
    };
  } catch (error) {
    console.error('שגיאה בקריאת גיבוי עבור קובץ:', error);
    return { full: null, selected: null };
  }
}

/**
 * Store full file backup
 */
export function storeFullFileBackup(fileId, originalContent) {
  try {
    const textLines = originalContent.split('\n');
    const backupKey = `${BACKUP_PREFIX}${fileId}`;
    
    localStorage.setItem(backupKey, JSON.stringify({
      original: originalContent,
      timestamp: Date.now(),
      lines: textLines.length,
      type: 'full_file'
    }));
  } catch (error) {
    console.error('שגיאה בשמירת גיבוי מלא:', error);
  }
}

/**
 * Store selected text backup
 */
export function storeSelectedTextBackup(fileId, selectedText) {
  try {
    const textLines = selectedText.split('\n');
    const backupKey = `${SELECTED_BACKUP_PREFIX}${fileId}`;
    
    localStorage.setItem(backupKey, JSON.stringify({
      original: selectedText,
      timestamp: Date.now(),
      lines: textLines.length,
      type: 'selected_text'
    }));
  } catch (error) {
    console.error('שגיאה בשמירת גיבוי טקסט נבחר:', error);
  }
}

/**
 * Get count of current backups
 */
export function getBackupCount() {
  try {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(BACKUP_PREFIX) || key.startsWith(SELECTED_BACKUP_PREFIX))) {
        count++;
      }
    }
    return count;
  } catch (error) {
    console.error('שגיאה בספירת גיבויים:', error);
    return 0;
  }
}

/**
 * Initialize backup system - clean up expired backups
 */
export function initializeBackupSystem() {
  cleanupExpiredBackups();
  
  // Set up periodic cleanup (every hour)
  setInterval(cleanupExpiredBackups, 1000 * 60 * 60);
  
  console.log('מערכת גיבויי AI אותחלה');
}

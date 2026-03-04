// frontend/src/hooks/useWorkspace.js
import { useState, useCallback, useEffect } from 'react';
import path from '../utils/pathUtils';
import LocalFileSystemService from '../services/LocalFileSystemService';

export default function useWorkspace(setGlobalLoadingMessage) {
  const [folderPathInput, setFolderPathInput] = useState('');
  const [workspaceFolders, setWorkspaceFolders] = useState([]);
  const [addFolderError, setAddFolderError] = useState(null);
  const [initialFoldersLoaded, setInitialFoldersLoaded] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  // Folders whose IndexedDB handle exists but needs re-permission from a user gesture
  const [pendingFolders, setPendingFolders] = useState([]); // string[]
  const [restoringPendingFolder, setRestoringPendingFolder] = useState(null);

  const updateWorkspaceFolderStructure = useCallback((basePath, newStructure) => {
    setWorkspaceFolders(prev => prev.map(wf =>
      wf.path === basePath ? { ...wf, structure: newStructure, isLoading: false, error: null } : wf
    ));
  }, []);

  const addWorkspaceFolder = useCallback(async (folderPathToAdd = null, isFromInitialLoad = false) => {
    // folderPathToAdd parameter is ignored - browser picker is used instead
    // Check if browser supports File System Access API
    if (!LocalFileSystemService.isSupported()) {
      const errorMsg = 'Browser not supported. Please use Chrome or Edge for local file access.';
      if (!isFromInitialLoad) setAddFolderError(errorMsg);
      alert(errorMsg);
      return false;
    }

    if (!isFromInitialLoad) setIsAddingFolder(true);
    setAddFolderError(null);

    const tempFolderId = `loading-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      // Open folder picker - user selects a folder
      const result = await LocalFileSystemService.openFolder();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to open folder');
      }

      const folderName = result.name;
      const folderPath = result.path;

      // Check if folder already exists in workspace
      if (workspaceFolders.some(wf => wf.name === folderName)) {
        if (!isFromInitialLoad) setAddFolderError("התיקייה כבר קיימת בסביבת העבודה.");
        return false;
      }

      // Optimistically add folder
      setWorkspaceFolders(prev => [...prev, { 
        path: folderPath, 
        name: folderName, 
        structure: result.structure, 
        isLoading: false, 
        error: null, 
        id: `wsf-${Date.now()}-${Math.random().toString(16).slice(2)}`
      }]);

      // Save to localStorage for persistence
      if (!isFromInitialLoad) {
        setFolderPathInput('');
        // Mark that user has added a folder - never show welcome modal again
        localStorage.setItem('fileConversionNeverShow', 'true');
        localStorage.removeItem('fileConversionPostponedTime');
        console.log(`Successfully added folder: ${folderName}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error opening folder:`, error);
      if (!isFromInitialLoad) setAddFolderError(error.message);
      setWorkspaceFolders(prev => prev.filter(wf => wf.id !== tempFolderId));
      return false;
    } finally {
      if (!isFromInitialLoad) setIsAddingFolder(false);
    }
  }, [workspaceFolders, setFolderPathInput]);

  /**
   * Add a workspace folder from an already-obtained FileSystemDirectoryHandle
   * (e.g. after programmatically creating and writing a converted folder).
   */
  const addWorkspaceFolderFromHandle = useCallback(async (directoryHandle) => {
    if (!directoryHandle) return false;
    setIsAddingFolder(true);
    setAddFolderError(null);
    try {
      const result = await LocalFileSystemService.registerDirectoryHandle(directoryHandle);
      if (!result.success) throw new Error(result.error || 'Failed to register folder');

      const { name: folderName, path: folderPath, structure } = result;

      if (workspaceFolders.some(wf => wf.name === folderName)) {
        setAddFolderError('התיקייה כבר קיימת בסביבת העבודה.');
        return false;
      }

      setWorkspaceFolders(prev => [...prev, {
        path: folderPath,
        name: folderName,
        structure,
        isLoading: false,
        error: null,
        id: `wsf-${Date.now()}-${Math.random().toString(16).slice(2)}`
      }]);

      localStorage.setItem('fileConversionNeverShow', 'true');
      localStorage.removeItem('fileConversionPostponedTime');
      return true;
    } catch (error) {
      console.error('addWorkspaceFolderFromHandle error:', error);
      setAddFolderError(error.message);
      return false;
    } finally {
      setIsAddingFolder(false);
    }
  }, [workspaceFolders]);

  const removeWorkspaceFolder = useCallback(async (folderPathToRemove) => {
    setGlobalLoadingMessage(`מסיר את ${path.basename(folderPathToRemove)} מסביבת העבודה...`);
    const updatedWorkspaceFolders = workspaceFolders.filter(wf => wf.path !== folderPathToRemove);
    setWorkspaceFolders(updatedWorkspaceFolders);

    try {
      // Remove from IndexedDB
      await LocalFileSystemService.removeDirectoryHandle(folderPathToRemove);
      
      // Remove from memory
      LocalFileSystemService.directoryHandles.delete(folderPathToRemove);
      
      console.log(`Removed folder ${folderPathToRemove} from workspace`);
    } catch (error) {
      console.error(`Error removing folder ${folderPathToRemove}:`, error);
      alert(`שגיאה בהסרת תיקייה: ${error.message}`);
    } finally {
        setGlobalLoadingMessage('');
    }
    return folderPathToRemove; // Return the path of the removed folder for App.jsx to react
  }, [workspaceFolders, setGlobalLoadingMessage]);


  useEffect(() => {
    if (initialFoldersLoaded) return; // Don't run again if already loaded

    const restoreSavedFolders = async () => {
      console.log('Restoring saved folders from IndexedDB...');
      try {
        // Get saved folder names from IndexedDB
        const savedFolderNames = await LocalFileSystemService.getSavedFolderNames();
        
        if (savedFolderNames && savedFolderNames.length > 0) {
          console.log('Found saved folders:', savedFolderNames);
          
          // If we have saved folders, user has used the app before - never show welcome modal
          localStorage.setItem('fileConversionNeverShow', 'true');
          localStorage.removeItem('fileConversionPostponedTime');
          
          let restoredCount = 0;
          let failedFolders = [];
          
          // Try to restore each folder
          for (const folderName of savedFolderNames) {
            try {
              const result = await LocalFileSystemService.restoreSavedFolder(folderName);
              
              if (result.success) {
                // Add to workspace
                setWorkspaceFolders(prev => {
                  // Check if already exists
                  if (prev.some(wf => wf.name === folderName)) {
                    return prev;
                  }
                  
                  return [...prev, {
                    path: result.path,
                    name: result.name,
                    structure: result.structure,
                    isLoading: false,
                    error: null,
                    id: `wsf-${Date.now()}-${Math.random().toString(16).slice(2)}`
                  }];
                });
                restoredCount++;
                console.log(`✅ Successfully restored folder: ${folderName}`);
              } else {
                console.warn(`Failed to restore folder ${folderName}:`, result.error);
                
                if (result.needsPermission) {
                  // Handle is in memory; queue for user-gesture re-grant
                  setPendingFolders(prev => prev.includes(folderName) ? prev : [...prev, folderName]);
                  console.log(`⏳ Folder "${folderName}" needs permission re-grant from user.`);
                } else if (result.permissionDenied) {
                  // User denied — drop from IndexedDB
                  await LocalFileSystemService.removeDirectoryHandle(folderName);
                  console.warn(`❌ Folder "${folderName}" permission denied, removed from storage.`);
                } else {
                  failedFolders.push(folderName);
                }
              }
            } catch (error) {
              console.error(`Error restoring folder ${folderName}:`, error);
              failedFolders.push(folderName);
            }
          }
          
          if (restoredCount > 0) {
            console.log(`✅ Restored ${restoredCount} folder(s) successfully`);
          }
          
          if (failedFolders.length > 0) {
            console.log(`⚠️ Could not restore ${failedFolders.length} folder(s):`, failedFolders);
            console.log('⚠️ Please click "בחר תיקייה מהמחשב" to re-add them.');
          }
        } else {
          console.log('No saved folders found');
        }
      } catch (error) {
        console.error('Error restoring saved folders:', error);
      } finally {
        setInitialFoldersLoaded(true);
      }
    };

    restoreSavedFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFoldersLoaded]);

  const startRenameInExplorerUI = useCallback((itemToRename, baseFolder) => {
    // ... (existing code)
    setWorkspaceFolders(prevWsf => prevWsf.map(wf => {
        if (wf.path === baseFolder.path) {
            const updateItemInStructure = (items) => {
                return items.map(i => {
                    if (i.path === itemToRename.path) {
                        return { ...i, startRenaming: true };
                    }
                    if (i.children) {
                        return { ...i, children: updateItemInStructure(i.children) };
                    }
                    return i;
                });
            };
            return { ...wf, structure: updateItemInStructure(wf.structure || []) };
        }
        return wf;
    }));
  }, []);
  
  const clearRenameFlagInExplorerUI = useCallback((itemThatWasTriggered, baseFolder) => {
    // ... (existing code)
    setWorkspaceFolders(prevWsf => prevWsf.map(wf => {
        if (wf.path === baseFolder.path) {
             const clearRenameFlagInStructure = (items) => {
                return items.map(i => {
                    if (i.path === itemThatWasTriggered.path) {
                        const { startRenaming, ...rest } = i; 
                        return rest;
                    }
                    if (i.children) {
                        return { ...i, children: clearRenameFlagInStructure(i.children) };
                    }
                    return i;
                });
            };
            return { ...wf, structure: clearRenameFlagInStructure(wf.structure || []) };
        }
        return wf;
    }));
  }, []);

  const refreshWorkspaceFolder = useCallback(async (folderPath) => {
    try {
      // Get the directory handle
      const dirHandle = await LocalFileSystemService.getDirectoryHandle(folderPath);
      
      if (!dirHandle) {
        console.error('Directory handle not found for:', folderPath);
        return;
      }

      // Rescan the directory (pass empty string to get relative paths from root)
      const structure = await LocalFileSystemService.scanDirectory(dirHandle, '');
      
      // Update the workspace folder structure
      setWorkspaceFolders(prevWsf => prevWsf.map(wf => {
        if (wf.path === folderPath) {
          return { ...wf, structure };
        }
        return wf;
      }));
      
      console.log('✅ Workspace folder refreshed:', folderPath);
    } catch (error) {
      console.error('Error refreshing workspace folder:', error);
    }
  }, []);

  // Called inside a user gesture — asks browser to re-grant permission for a pending folder
  const restorePendingFolder = useCallback(async (folderName) => {
    setRestoringPendingFolder(folderName);
    try {
      const result = await LocalFileSystemService.restoreFolderWithPermission(folderName);
      if (result.success) {
        setWorkspaceFolders(prev => {
          if (prev.some(wf => wf.name === folderName)) return prev;
          return [...prev, {
            path: result.path,
            name: result.name,
            structure: result.structure,
            isLoading: false,
            error: null,
            id: `wsf-${Date.now()}-${Math.random().toString(16).slice(2)}`
          }];
        });
        setPendingFolders(prev => prev.filter(n => n !== folderName));
        console.log(`✅ Permission re-granted for folder: ${folderName}`);
        return true;
      } else {
        console.warn(`Permission re-grant failed for ${folderName}:`, result.error);
        return false;
      }
    } catch (err) {
      console.error('restorePendingFolder error:', err);
      return false;
    } finally {
      setRestoringPendingFolder(null);
    }
  }, []);


  return {
    folderPathInput,
    setFolderPathInput,
    workspaceFolders,
    setWorkspaceFolders,
    addFolderError,
    isAddingFolder,
    addWorkspaceFolder,
    addWorkspaceFolderFromHandle,
    removeWorkspaceFolder,
    updateWorkspaceFolderStructure,
    refreshWorkspaceFolder,
    startRenameInExplorerUI,
    clearRenameFlagInExplorerUI,
    initialFoldersLoaded,
    pendingFolders,
    restoringPendingFolder,
    restorePendingFolder,
  };
}

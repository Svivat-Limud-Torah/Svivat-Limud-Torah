// frontend/src/hooks/useWorkspace.js
import { useState, useCallback, useEffect } from 'react';
import path from '../utils/pathUtils';
import { API_BASE_URL } from '../utils/constants';

export default function useWorkspace(setGlobalLoadingMessage) {
  const [folderPathInput, setFolderPathInput] = useState('');
  const [workspaceFolders, setWorkspaceFolders] = useState([]);
  const [addFolderError, setAddFolderError] = useState(null);
  const [initialFoldersLoaded, setInitialFoldersLoaded] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  const updateWorkspaceFolderStructure = useCallback((basePath, newStructure) => {
    setWorkspaceFolders(prev => prev.map(wf =>
      wf.path === basePath ? { ...wf, structure: newStructure, isLoading: false, error: null } : wf
    ));
  }, []);

  const addWorkspaceFolder = useCallback(async (folderPathToAdd, isFromInitialLoad = false) => {
    // ... (existing code for addWorkspaceFolder) ...
    if (!folderPathToAdd || !folderPathToAdd.trim()) {
      if (!isFromInitialLoad) setAddFolderError("אנא הזן נתיב תיקייה.");
      return false; // Indicate failure
    }
    if (workspaceFolders.some(wf => wf.path === folderPathToAdd)) {
      if (!isFromInitialLoad) setAddFolderError("התיקייה כבר קיימת בסביבת העבודה.");
      return false; // Indicate failure
    }

    if (!isFromInitialLoad) setIsAddingFolder(true);
    setAddFolderError(null);

    const folderName = path.basename(folderPathToAdd);
    const tempFolderId = `loading-${Date.now()}-${Math.random().toString(16).slice(2)}`; // Make temp ID more unique too

    // Optimistically add with temporary ID
    setWorkspaceFolders(prev => [...prev, { path: folderPathToAdd, name: folderName, structure: null, isLoading: true, error: null, id: tempFolderId }]);

    try {
      const response = await fetch(`${API_BASE_URL}/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folderPathToAdd }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);

      const newPermanentId = `wsf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setWorkspaceFolders(prev => prev.map(wf =>
        wf.id === tempFolderId // Find by the temporary ID
          ? { ...wf, path: folderPathToAdd, name: folderName, structure: data, isLoading: false, error: null, id: newPermanentId } // Update with new permanent ID
          : wf
      ));
      // Note: The filter operation after map was removed as it's not strictly necessary if tempFolderId is unique and correctly replaced.
      // If there's a need to clean up other potential duplicates or ensure tempFolderId doesn't persist, it could be added back carefully.

      if (!isFromInitialLoad) {
        setFolderPathInput('');
        // Get current paths *after* successful addition, not from potentially stale closure
        const currentPaths = (await (async () => {
            let paths = [];
            setWorkspaceFolders(currentWFs => { // Read the latest state
                paths = currentWFs.map(wf => wf.path).filter(p => p && p !== tempFolderId);
                return currentWFs;
            });
            return paths;
        })()).filter(p => p !== folderPathToAdd); // ensure the added one is not duplicated if logic changes

        const updatedPaths = Array.from(new Set([...currentPaths, folderPathToAdd])); // Use Set to ensure uniqueness

        fetch(`${API_BASE_URL}/settings/last-opened-folders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPaths: updatedPaths }),
        });
      }
      return true; // Indicate success
    } catch (error) {
      console.error(`שגיאה בפתיחת תיקייה ${folderPathToAdd}:`, error);
      if (!isFromInitialLoad) setAddFolderError(error.message);
      // If an error occurs, remove the optimistically added folder, or mark it with an error and a stable ID.
      // Current approach: remove the folder that was added with tempFolderId.
      setWorkspaceFolders(prev => prev.filter(wf => wf.id !== tempFolderId));
      // If we wanted to keep it with an error state, it would need a permanent unique ID here too:
      // const errorId = `err-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      // setWorkspaceFolders(prev => prev.map(wf =>
      //   wf.id === tempFolderId
      //     ? { ...wf, isLoading: false, error: error.message, id: errorId }
      //     : wf
      // ));
      return false; // Indicate failure
    } finally {
      if (!isFromInitialLoad) setIsAddingFolder(false);
    }
  }, [workspaceFolders, setGlobalLoadingMessage]); // Removed setGlobalLoadingMessage as it's not used inside

  const removeWorkspaceFolder = useCallback(async (folderPathToRemove) => {
    setGlobalLoadingMessage(`מסיר את ${path.basename(folderPathToRemove)} מסביבת העבודה...`);
    const updatedWorkspaceFolders = workspaceFolders.filter(wf => wf.path !== folderPathToRemove);
    setWorkspaceFolders(updatedWorkspaceFolders);

    try {
      const updatedPaths = updatedWorkspaceFolders.map(wf => wf.path);
      await fetch(`${API_BASE_URL}/settings/last-opened-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPaths: updatedPaths }),
      });
      // The App.jsx useEffect will handle closing tabs and clearing search scope
    } catch (error) {
      console.error(`שגיאה בעדכון תיקיות אחרונות לאחר הסרה של ${folderPathToRemove}:`, error);
      // Optionally, revert workspaceFolders state or notify user
      alert(`שגיאה בעדכון הגדרות לאחר הסרת תיקייה: ${error.message}`);
    } finally {
        setGlobalLoadingMessage('');
    }
    return folderPathToRemove; // Return the path of the removed folder for App.jsx to react
  }, [workspaceFolders, setGlobalLoadingMessage]);


  useEffect(() => {
    if (initialFoldersLoaded) return; // Don't run again if already loaded

    const fetchLastOpenedFolders = async () => {
      console.log('Fetching last opened folders from server...');
      try {
        const response = await fetch(`${API_BASE_URL}/settings/last-opened-folders`);
        if (!response.ok) {
          console.warn(`לא ניתן לטעון תיקיות אחרונות: ${response.statusText}`);
          return;
        }
        const data = await response.json();
        console.log('Last opened folders received:', data);
        if (data.folderPaths && Array.isArray(data.folderPaths)) {
          console.log(`Loading ${data.folderPaths.length} workspace folders...`);
          // Sequentially add folders to maintain order and avoid race conditions with settings update
          for (const fp of data.folderPaths) {
            await addWorkspaceFolder(fp, true);
          }
        } else {
          console.log('No workspace folders to load');
        }
      } catch (error) {
        console.warn("שגיאה בטעינת תיקיות אחרונות מהשרת:", error);
      } finally {
        console.log('Setting initialFoldersLoaded to true');
        setInitialFoldersLoaded(true); // Mark as loaded
      }
    };
    fetchLastOpenedFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addWorkspaceFolder, initialFoldersLoaded]); // addWorkspaceFolder is memoized and now a dependency

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


  return {
    folderPathInput,
    setFolderPathInput,
    workspaceFolders,
    setWorkspaceFolders,
    addFolderError,
    isAddingFolder,
    addWorkspaceFolder,
    removeWorkspaceFolder, // <-- Export the new function
    updateWorkspaceFolderStructure,
    startRenameInExplorerUI,
    clearRenameFlagInExplorerUI,
    initialFoldersLoaded, // <-- Export the initialFoldersLoaded state
  };
}

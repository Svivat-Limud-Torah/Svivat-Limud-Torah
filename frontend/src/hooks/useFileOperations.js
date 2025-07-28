// frontend/src/hooks/useFileOperations.js
import { useState, useCallback } from 'react';
import path from '../utils/pathUtils';
import { API_BASE_URL } from '../utils/constants';
import { generateTabId } from './useTabs'; // Assuming generateTabId is exported from useTabs or a util

export default function useFileOperations({
  openTabs, // from useTabs
  activeTabPath, // from App (via useTabs state)
  setOpenTabs, // from useTabs
  setActiveTabPathApp, // from App (direct setter for App's activeTabPath)
  workspaceFolders, // from useWorkspace
  updateWorkspaceFolderStructure, // from useWorkspace
  handleFileSelect, // from useTabs
  handleCloseTab, // from useTabs
  fetchStatsFiles, // from useStats
  setGlobalLoadingMessage,
  setIsSaveAsModalOpen,
  setSaveAsData,
}) {
  const [savingTabPath, setSavingTabPath] = useState(null);

  const handleSaveFile = useCallback(async (saveAs = false) => {
    const activeTabObject = openTabs.find(tab => tab.id === activeTabPath);

    if (!activeTabObject || activeTabObject.type === 'image') {
      if (activeTabObject && activeTabObject.type === 'image') { /* Allow silent return for images */ }
      else { console.warn("No active text file to save or missing file info."); }
      return;
    }

    // If it's not a "Save As" operation and the file isn't dirty, or if it's a new unsaved file without a real path yet (and not Save As)
    if (!saveAs && !activeTabObject.isDirty) {
      console.log("No changes to save.");
      return;
    }
    // If it's a new unsaved file and not a "Save As" operation, treat it as "Save As"
    if (activeTabObject.isNewUnsaved && !saveAs) {
      // console.log("New unsaved file, triggering Save As flow.");
      // Fall through to Save As logic by re-calling or structuring flow
      // For simplicity here, we'll let the saveAs logic handle it if called directly.
      // Or, we can directly call handleSaveFileAs here.
      // Let's assume for now that Ctrl+S on a new file will trigger this with saveAs=true from App.jsx
    }


    let targetBasePath = activeTabObject.basePath;
    let targetRelativePath = activeTabObject.relativePath;
    let targetFileName = activeTabObject.name;

    if (saveAs || activeTabObject.isNewUnsaved) {
      // Use modal instead of electronAPI.showSaveDialog
      setGlobalLoadingMessage('');
      
      // Extract file name without extension
      const fileName = activeTabObject.name;
      const lastDotIndex = fileName.lastIndexOf('.');
      const nameWithoutExtension = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
      const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : 'md';
      
      // Find workspace folder for current tab
      const currentWorkspaceFolder = workspaceFolders.find(wf => wf.path === activeTabObject.basePath);
      
      // Set up save data for the modal
      setSaveAsData({
        tabId: activeTabPath,
        fileName: nameWithoutExtension,
        extension: extension,
        content: activeTabObject.content || '',
        workspaceFolder: currentWorkspaceFolder
      });
      
      // Open the save modal
      setIsSaveAsModalOpen(true);
      return;
    }
    
    // Ensure basePath is not the special marker if we are actually saving
    if (targetBasePath === '__new_unsaved__') {
        console.error("Cannot save with special basePath '__new_unsaved__'. This indicates an issue with Save As logic.");
        alert("שגיאה פנימית: נתיב שמירה לא תקין.");
        return;
    }


    setSavingTabPath(activeTabObject.id); // Still use original ID for saving indicator
    setGlobalLoadingMessage(`שומר את ${targetFileName}...`);

    try {
      const response = await fetch(`${API_BASE_URL}/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseFolderPath: targetBasePath,
          relativeFilePath: targetRelativePath,
          content: activeTabObject.content,
          fileName: targetFileName, // Use the potentially new file name
          styles: activeTabObject.styles || []
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);
      
      const newTabId = generateTabId(targetBasePath, targetRelativePath);

      setOpenTabs(prevTabs => {
        const newTabs = prevTabs.map(t => {
          if (t.id === activeTabObject.id) {
            return {
              ...t,
              id: newTabId, // Update ID if path changed
              basePath: targetBasePath,
              relativePath: targetRelativePath,
              name: targetFileName,
              isDirty: false,
              isNewUnsaved: false, // No longer a new unsaved file
            };
          }
          return t;
        });
        // If a tab with the new ID already exists (e.g. saving over an existing open tab after 'Save As')
        // remove the old one. This can happen if user "Save As" an untitled file over an existing file that is already open.
        // The map above would have updated the *original* tab. Now we check if another tab *already* had the new ID.
        // This scenario is complex. A simpler approach for "Save As" is to always treat the saved tab as "new"
        // in terms of its identity in the tab list if the path changes, potentially closing the original if it was an unsaved new file.

        // If the ID changed, we need to ensure no duplicate IDs.
        // If activeTabObject.id is different from newTabId, it means we saved to a new location/name.
        // The original tab (activeTabObject.id) should be replaced or removed.
        if (activeTabObject.id !== newTabId) {
            // Remove the original tab if it was a "Save As" from an unsaved tab or a different file
            const filteredTabs = newTabs.filter(t => t.id !== activeTabObject.id || t.id === newTabId);
            // Ensure the new/updated tab is present
            if (!filteredTabs.some(t => t.id === newTabId)) {
                 // This case should ideally be handled by the map, but as a safeguard:
                const updatedTabEntry = {
                    ...activeTabObject, // spread original content etc.
                    id: newTabId,
                    basePath: targetBasePath,
                    relativePath: targetRelativePath,
                    name: targetFileName,
                    isDirty: false,
                    isNewUnsaved: false,
                };
                // Check if we are overwriting an existing *different* tab
                const existingOtherTabIndex = filteredTabs.findIndex(t => t.id === newTabId);
                if (existingOtherTabIndex > -1) {
                    filteredTabs[existingOtherTabIndex] = updatedTabEntry; // Overwrite the tab being saved upon
                } else {
                    filteredTabs.push(updatedTabEntry); // Add as new if it wasn't an overwrite of an existing tab
                }
                return filteredTabs;
            }
            return filteredTabs;
        }
        return newTabs;
      });

      setActiveTabPathApp(newTabId); // Update active tab to the new ID/path
      
      // If the file was saved into a workspace folder, update its structure
      const targetWorkspaceFolder = workspaceFolders.find(wf => wf.path === targetBasePath);
      if (targetWorkspaceFolder && data.directoryStructure) {
          updateWorkspaceFolderStructure(targetBasePath, data.directoryStructure);
      } else if (targetWorkspaceFolder && !data.directoryStructure) {
          // If backend didn't send structure, DO NOT update with null.
          // The existing structure will remain, preventing folders from disappearing.
          // A more robust solution might involve explicitly re-fetching the structure.
          console.warn(`Directory structure not returned from backend for ${targetBasePath} after save. Sidebar might display a stale structure until next refresh.`);
      }


      console.log(data.message);
      fetchStatsFiles();
    } catch (error) {
      console.error(`שגיאה בשמירת הקובץ (${saveAs ? 'Save As' : 'Save'}):`, error);
      alert(`שגיאה בשמירת הקובץ: ${error.message}`);
    } finally {
      setSavingTabPath(null);
      setGlobalLoadingMessage('');
    }
  }, [activeTabPath, openTabs, setOpenTabs, fetchStatsFiles, setGlobalLoadingMessage]);

  // Function to save file to a specific path (used by Save As modal)
  const saveFileToPath = useCallback(async (tabId, basePath, relativePath, content) => {
    setGlobalLoadingMessage(`שומר את ${path.basename(relativePath)}...`);
    try {
      const fileName = path.basename(relativePath);
      const response = await fetch(`${API_BASE_URL}/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          baseFolderPath: basePath, 
          relativeFilePath: relativePath, 
          content: content,
          fileName: fileName
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);

      console.log(data.message);
      
      // Update tab information
      const fullPath = path.join(basePath, relativePath);
      const newTabId = generateTabId(basePath, relativePath);
      
      setOpenTabs(prevTabs => 
        prevTabs.map(tab => {
          if (tab.id === tabId) {
            return {
              ...tab,
              id: newTabId,
              name: fileName,
              basePath: basePath,
              relativePath: relativePath,
              isDirty: false,
              isNewUnsaved: false
            };
          }
          return tab;
        })
      );
      
      // Update active tab path if this was the active tab
      setActiveTabPathApp(newTabId);
      
      // Update workspace structure
      updateWorkspaceFolderStructure(basePath, data.directoryStructure);
      
      // Refresh stats
      fetchStatsFiles();
      
      setGlobalLoadingMessage('');
      return true;
    } catch (error) {
      console.error('שגיאה בשמירת הקובץ:', error);
      alert(`שגיאה בשמירת הקובץ: ${error.message}`);
      setGlobalLoadingMessage('');
      return false;
    }
  }, [setOpenTabs, setActiveTabPathApp, updateWorkspaceFolderStructure, fetchStatsFiles, setGlobalLoadingMessage]);

  const handleCreateNewFileOrSummary = useCallback(async (baseFolderPath, relativeNewFilePath, content = '', openAfterCreate = true) => {
    if (!baseFolderPath || !relativeNewFilePath) {
      alert("מידע חסר ליצירת קובץ.");
      return false;
    }
    setGlobalLoadingMessage(`יוצר את ${path.basename(relativeNewFilePath)}...`);
    try {
      const response = await fetch(`${API_BASE_URL}/create-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseFolderPath, newFilePath: relativeNewFilePath, content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);

      console.log(data.message);
      updateWorkspaceFolderStructure(baseFolderPath, data.directoryStructure);

      if (openAfterCreate && data.newFile) {
        const targetFolder = workspaceFolders.find(wf => wf.path === baseFolderPath);
        if (targetFolder) {
          const fileToOpen = {
            name: data.newFile.name, path: data.newFile.path,
            isFolder: data.newFile.isFolder, type: data.newFile.type
          };
          handleFileSelect(targetFolder, fileToOpen);
        }
      }
      fetchStatsFiles();
      return true;
    } catch (error) {
      console.error("שגיאה ביצירת קובץ:", error);
      alert(`שגיאה ביצירת קובץ: ${error.message}`);
      return false;
    } finally {
      setGlobalLoadingMessage('');
    }
  }, [setGlobalLoadingMessage, updateWorkspaceFolderStructure, workspaceFolders, handleFileSelect, fetchStatsFiles]);

  const createNewFileFromExplorer = useCallback(async (parentItem, baseFolder) => {
    const newFileName = prompt(`הזן שם לקובץ החדש (בתוך ${parentItem ? parentItem.name : baseFolder.name}):`);
    if (!newFileName || !newFileName.trim()) return;
    if (newFileName.includes('/') || newFileName.includes('\\')) {
      alert("שם קובץ אינו יכול לכלול '/' או '\\'."); return;
    }
    const relativeParentPath = parentItem ? parentItem.path : '';
    const relativeNewFilePath = path.join(relativeParentPath, newFileName.trim());
    await handleCreateNewFileOrSummary(baseFolder.path, relativeNewFilePath, '', true);
  }, [handleCreateNewFileOrSummary]);

  const createNewFolderFromExplorer = useCallback(async (newFolderName, parentItem, baseFolder) => {
    if (!newFolderName || !newFolderName.trim()) return;
    if (newFolderName.includes('/') || newFolderName.includes('\\')) {
      alert("שם תיקייה אינו יכול לכלול '/' או '\\'."); return;
    }
    const relativeParentPath = parentItem ? parentItem.path : '';
    const newFolderRelativePath = path.join(relativeParentPath, newFolderName.trim());
    setGlobalLoadingMessage(`יוצר תיקייה ${newFolderName}...`);
    try {
      const response = await fetch(`${API_BASE_URL}/create-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseFolderPath: baseFolder.path, newFolderRelativePath })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);
      console.log(data.message);
      updateWorkspaceFolderStructure(baseFolder.path, data.directoryStructure);
      fetchStatsFiles();
    } catch (error) {
      console.error("שגיאה ביצירת תיקייה:", error);
      alert(`שגיאה ביצירת תיקייה: ${error.message}`);
    } finally {
      setGlobalLoadingMessage('');
    }
  }, [setGlobalLoadingMessage, updateWorkspaceFolderStructure, fetchStatsFiles]);

  const deleteItemFromExplorer = useCallback(async (itemToDelete, baseFolder) => {
    setGlobalLoadingMessage(`מוחק את ${itemToDelete.name}...`);
    try {
      const response = await fetch(`${API_BASE_URL}/delete-item`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseFolderPath: baseFolder.path, relativePathToDelete: itemToDelete.path })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);
      console.log(data.message);
      updateWorkspaceFolderStructure(baseFolder.path, data.directoryStructure);

      const tabsToClose = openTabs.filter(tab => {
        if (tab.basePath !== baseFolder.path) return false;
        if (itemToDelete.isFolder) {
          return tab.relativePath === itemToDelete.path || tab.relativePath.startsWith(itemToDelete.path + '/');
        }
        return tab.relativePath === itemToDelete.path;
      });
      tabsToClose.forEach(tab => handleCloseTab(tab.id, null));
      fetchStatsFiles();
    } catch (error) {
      console.error("שגיאה במחיקת פריט:", error);
      alert(`שגיאה במחיקת פריט: ${error.message}`);
    } finally {
      setGlobalLoadingMessage('');
    }
  }, [setGlobalLoadingMessage, updateWorkspaceFolderStructure, openTabs, handleCloseTab, fetchStatsFiles]);

  const renameItemInExplorer = useCallback(async (itemToRename, newName, baseFolder) => {
    if (!newName || newName === itemToRename.name) return;
    if (newName.includes('/') || newName.includes('\\')) {
      alert("שם חדש אינו יכול לכלול '/' או '\\'."); return;
    }
    setGlobalLoadingMessage(`משנה שם ל-${newName}...`);
    try {
      const response = await fetch(`${API_BASE_URL}/rename-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseFolderPath: baseFolder.path, oldRelativePath: itemToRename.path, newName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);
      console.log(data.message);
      updateWorkspaceFolderStructure(baseFolder.path, data.directoryStructure);

      const { oldRelativePath, newRelativePath, isFolder } = data.renamedItem;
      const oldPrefix = oldRelativePath + (isFolder ? '/' : '');

      setOpenTabs(prevTabs => prevTabs.map(tab => {
        if (tab.basePath !== baseFolder.path) return tab;
        let updatedTab = { ...tab };
        let pathChanged = false;
        if (isFolder) {
          if (tab.relativePath === oldRelativePath || tab.relativePath.startsWith(oldPrefix)) {
            updatedTab.relativePath = tab.relativePath.replace(oldRelativePath, newRelativePath);
            pathChanged = true;
          }
        } else {
          if (tab.relativePath === oldRelativePath) {
            updatedTab.relativePath = newRelativePath;
            updatedTab.name = newName;
            pathChanged = true;
          }
        }
        if (pathChanged) {
          updatedTab.id = generateTabId(updatedTab.basePath, updatedTab.relativePath);
        }
        return updatedTab;
      }));

      const oldActiveTabId = activeTabPath;
      if (oldActiveTabId && oldActiveTabId.startsWith(baseFolder.path + "::")) {
        const oldActiveRelativePath = oldActiveTabId.substring((baseFolder.path + "::").length);
        let newActiveRelativePath = null;
        if (isFolder) {
          if (oldActiveRelativePath === oldRelativePath || oldActiveRelativePath.startsWith(oldPrefix)) {
            newActiveRelativePath = oldActiveRelativePath.replace(oldRelativePath, newRelativePath);
          }
        } else {
          if (oldActiveRelativePath === oldRelativePath) {
            newActiveRelativePath = newRelativePath;
          }
        }
        if (newActiveRelativePath) {
          setActiveTabPathApp(generateTabId(baseFolder.path, newActiveRelativePath));
        }
      }
      fetchStatsFiles();
    } catch (error) {
      console.error("שגיאה בשינוי שם פריט:", error);
      alert(`שגיאה בשינוי שם פריט: ${error.message}`);
    } finally {
      setGlobalLoadingMessage('');
    }
  }, [setGlobalLoadingMessage, updateWorkspaceFolderStructure, setOpenTabs, activeTabPath, setActiveTabPathApp, fetchStatsFiles]);

  const dropItemInExplorer = useCallback(async (draggedItemData, targetFolderItem, targetBaseFolder) => {
    const { sourceBaseFolderPath, itemPath: sourceRelativePath, itemName } = draggedItemData;
    const targetParentRelativePath = targetFolderItem.path;

    setGlobalLoadingMessage(`מעביר את ${itemName}...`);
    try {
      const response = await fetch(`${API_BASE_URL}/move-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBaseFolderPath, sourceRelativePath,
          targetBaseFolderPath: targetBaseFolder.path,
          targetParentRelativePath
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `שגיאה מהשרת: ${response.status}`);
      console.log(data.message);
      if (data.updatedSourceStructure) {
        updateWorkspaceFolderStructure(sourceBaseFolderPath, data.updatedSourceStructure);
      }
      updateWorkspaceFolderStructure(targetBaseFolder.path, data.updatedTargetStructure);

      const {
        originalSourceBaseFolderPath, originalSourceRelativePath,
        newTargetBaseFolderPath, newTargetRelativePath,
        isFolder: movedItemIsFolder
      } = data.movedItemDetails;
      const oldItemPrefix = originalSourceRelativePath + (movedItemIsFolder ? '/' : '');

      setOpenTabs(prevTabs => prevTabs.map(tab => {
        if (tab.basePath !== originalSourceBaseFolderPath) return tab;
        let pathMatches = false;
        if (movedItemIsFolder) {
          pathMatches = tab.relativePath === originalSourceRelativePath || tab.relativePath.startsWith(oldItemPrefix);
        } else {
          pathMatches = tab.relativePath === originalSourceRelativePath;
        }
        if (pathMatches) {
          const pathSegmentInsideMoved = tab.relativePath.substring(originalSourceRelativePath.length);
          const finalNewRelativePathForTab = path.join(newTargetRelativePath, pathSegmentInsideMoved).replace(/\\/g, '/');
          const updatedTab = {
            ...tab,
            basePath: newTargetBaseFolderPath,
            relativePath: finalNewRelativePathForTab,
            id: generateTabId(newTargetBaseFolderPath, finalNewRelativePathForTab)
          };
          if (!movedItemIsFolder && tab.relativePath === originalSourceRelativePath) {
            updatedTab.name = path.basename(newTargetRelativePath);
          }
          return updatedTab;
        }
        return tab;
      }));

      if (activeTabPath && activeTabPath.startsWith(originalSourceBaseFolderPath + "::")) {
        const activeTabOriginalRelative = activeTabPath.substring((originalSourceBaseFolderPath + "::").length);
        let pathMatchesActive = false;
        if (movedItemIsFolder) {
          pathMatchesActive = activeTabOriginalRelative === originalSourceRelativePath || activeTabOriginalRelative.startsWith(oldItemPrefix);
        } else {
          pathMatchesActive = activeTabOriginalRelative === originalSourceRelativePath;
        }
        if (pathMatchesActive) {
          const pathSegmentInsideMoved = activeTabOriginalRelative.substring(originalSourceRelativePath.length);
          const finalNewRelativePathForActiveTab = path.join(newTargetRelativePath, pathSegmentInsideMoved).replace(/\\/g, '/');
          setActiveTabPathApp(generateTabId(newTargetBaseFolderPath, finalNewRelativePathForActiveTab));
        }
      }
      fetchStatsFiles();
    } catch (error) {
      console.error("שגיאה בהעברת פריט:", error);
      alert(`שגיאה בהעברת פריט: ${error.message}`);
    } finally {
      setGlobalLoadingMessage('');
    }
  }, [setGlobalLoadingMessage, updateWorkspaceFolderStructure, setOpenTabs, activeTabPath, setActiveTabPathApp, fetchStatsFiles]);

  return {
    savingTabPath,
    handleSaveFile, // Now accepts a 'saveAs' boolean
    // handleSaveFileAs will be implicitly handled by handleSaveFile(true)
    handleCreateNewFileOrSummary,
    saveFileToPath, // Export the new function
    createNewFileFromExplorer,
    createNewFolderFromExplorer,
    deleteItemFromExplorer,
    renameItemInExplorer,
    dropItemInExplorer,
  };
}

// frontend/src/hooks/useTabs.js
import { useState, useCallback, useEffect, useRef } from 'react';
import path from '../utils/pathUtils';
import { SUPPORTED_IMAGE_EXTENSIONS_CLIENT, SUPPORTED_PDF_EXTENSIONS_CLIENT, SUPPORTED_AUDIO_EXTENSIONS_CLIENT, SUPPORTED_VIDEO_EXTENSIONS_CLIENT, API_BASE_URL } from '../utils/constants';
import LocalFileSystemService from '../services/LocalFileSystemService';

export const generateTabId = (basePath, relativePath) => {
  if (basePath === '__new_unsaved__') {
    return `untitled::${relativePath}`; // relativePath will be like "Untitled-1.md"
  }
  return `${basePath}::${relativePath}`;
};

export default function useTabs({
  fetchStatsFiles,
  setMainViewMode,
  setScrollToLine,
  setSearchTermToHighlightInEditor,
  // For cleaning up AI views when tab closes
  activeTabPathHook, // Renamed to avoid conflict with internal activeTabPath
  setFlashcardData,
  originalFileForSummary,
  setOriginalFileForSummary,
  setSummaryText,
  setSummaryError,
  initialFoldersLoaded,
}) {
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabPath, setActiveTabPathState] = useState(null); // Internal activeTabPath for this hook
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [fileError, setFileError] = useState(null);
  const untitledCounterRef = useRef(0);
  // Guard: don't let the save effect run before restoration completes (otherwise
  // the initial empty openTabs would wipe the persisted data from localStorage).
  const hasRestoredTabsRef = useRef(false);

  // State for unsaved changes modal
  const [unsavedChangesModal, setUnsavedChangesModal] = useState({
    isOpen: false,
    tabToClose: null,
    isSaving: false
  });

  // Use a setter that also updates the hook's own activeTabPath
  const setActiveTabPath = useCallback((newActiveTabPath) => {
    setActiveTabPathState(newActiveTabPath);
    if (activeTabPathHook && activeTabPathHook.setter) {
      activeTabPathHook.setter(newActiveTabPath);
    }
  }, [activeTabPathHook]);

  // Load tabs from localStorage on initial mount
  useEffect(() => {
    // Wait until folders are loaded before restoring tabs
    if (!initialFoldersLoaded) {
      return;
    }

    try {
      const savedTabsData = localStorage.getItem('torahIdeOpenTabs');
      if (savedTabsData) {
        const { tabs: loadedTabs, activeTabId: loadedActiveTabId } = JSON.parse(savedTabsData);
        if (Array.isArray(loadedTabs) && loadedTabs.length > 0) {
          const sanitizedTabs = loadedTabs.map(tab => {
            const isNewUnsavedTab = tab.isNewUnsaved === true;
            const hasUnsavedContent = tab.unsavedContent !== undefined && tab.type === 'file';

            if (isNewUnsavedTab && tab.name && tab.name.startsWith("Untitled-")) {
              const numMatch = tab.name.match(/Untitled-(\d+)\.md/);
              if (numMatch && numMatch[1]) {
                const num = parseInt(numMatch[1], 10);
                if (num > untitledCounterRef.current) {
                  untitledCounterRef.current = num;
                }
              }
            }

            return {
              id: tab.id,
              name: tab.name,
              basePath: tab.basePath,
              relativePath: tab.relativePath,
              type: tab.type,
              isDirty: isNewUnsavedTab || hasUnsavedContent,
              content: (isNewUnsavedTab || hasUnsavedContent) ? (tab.unsavedContent || '') : (tab.type === 'file' ? undefined : null),
              imageUrl: tab.type === 'image' ? undefined : null,
              pdfUrl: tab.type === 'pdf' ? undefined : null,
              audioUrl: tab.type === 'audio' ? undefined : null,
              videoUrl: tab.type === 'video' ? undefined : null,
              isNewUnsaved: isNewUnsavedTab,
              scrollPosition: tab.scrollPosition || 0, // Restore scroll position
            };
          });
          setOpenTabs(sanitizedTabs);
          if (loadedActiveTabId && sanitizedTabs.some(t => t.id === loadedActiveTabId)) {
            setActiveTabPath(loadedActiveTabId);
            const activeRestoredTab = sanitizedTabs.find(t => t.id === loadedActiveTabId);
            if (activeRestoredTab && !activeRestoredTab.isNewUnsaved) {
              if (activeRestoredTab.content === undefined && activeRestoredTab.type === 'file') {
                setTimeout(() => {
                  loadFileContentForTab(activeRestoredTab.basePath, activeRestoredTab.relativePath, activeRestoredTab.name, activeRestoredTab.type);
                }, 100);
              } else if (activeRestoredTab.type === 'image' && activeRestoredTab.imageUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(activeRestoredTab.basePath, activeRestoredTab.relativePath, activeRestoredTab.name, activeRestoredTab.type);
                }, 100);
              } else if (activeRestoredTab.type === 'pdf' && activeRestoredTab.pdfUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(activeRestoredTab.basePath, activeRestoredTab.relativePath, activeRestoredTab.name, activeRestoredTab.type);
                }, 100);
              } else if (activeRestoredTab.type === 'audio' && activeRestoredTab.audioUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(activeRestoredTab.basePath, activeRestoredTab.relativePath, activeRestoredTab.name, activeRestoredTab.type);
                }, 100);
              } else if (activeRestoredTab.type === 'video' && activeRestoredTab.videoUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(activeRestoredTab.basePath, activeRestoredTab.relativePath, activeRestoredTab.name, activeRestoredTab.type);
                }, 100);
              }
            }
          } else if (sanitizedTabs.length > 0) {
            const firstRestoredTab = sanitizedTabs[0];
            setActiveTabPath(firstRestoredTab.id);
            if (firstRestoredTab && !firstRestoredTab.isNewUnsaved) {
              if (firstRestoredTab.content === undefined && firstRestoredTab.type === 'file') {
                setTimeout(() => {
                  loadFileContentForTab(firstRestoredTab.basePath, firstRestoredTab.relativePath, firstRestoredTab.name, firstRestoredTab.type);
                }, 100);
              } else if (firstRestoredTab.type === 'image' && firstRestoredTab.imageUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(firstRestoredTab.basePath, firstRestoredTab.relativePath, firstRestoredTab.name, firstRestoredTab.type);
                }, 100);
              } else if (firstRestoredTab.type === 'pdf' && firstRestoredTab.pdfUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(firstRestoredTab.basePath, firstRestoredTab.relativePath, firstRestoredTab.name, firstRestoredTab.type);
                }, 100);
              } else if (firstRestoredTab.type === 'audio' && firstRestoredTab.audioUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(firstRestoredTab.basePath, firstRestoredTab.relativePath, firstRestoredTab.name, firstRestoredTab.type);
                }, 100);
              } else if (firstRestoredTab.type === 'video' && firstRestoredTab.videoUrl === undefined) {
                setTimeout(() => {
                  loadFileContentForTab(firstRestoredTab.basePath, firstRestoredTab.relativePath, firstRestoredTab.name, firstRestoredTab.type);
                }, 100);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading tabs from localStorage:", error);
      // Optionally clear corrupted data
      // localStorage.removeItem('torahIdeOpenTabs');
    } finally {
      // Mark restoration as done so the save effect is now allowed to write
      hasRestoredTabsRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFoldersLoaded]); // Wait for folders to load before restoring tabs


  // Save tabs to localStorage whenever openTabs or activeTabPath changes
  useEffect(() => {
    // Don't save during the initial mount before tabs have been restored —
    // openTabs is [] at that point and would wipe the persisted data.
    if (!hasRestoredTabsRef.current) return;
    try {
      if (openTabs.length > 0) {
        // Exclude __dragged__ binary tabs (blob URLs are temporary and don't survive refresh)
        const tabsToSave = openTabs
          .filter(tab => !(tab.basePath === '__dragged__' && tab.type !== 'file'))
          .map(tab => ({
          id: tab.id,
          name: tab.name,
          basePath: tab.basePath,
          relativePath: tab.relativePath,
          type: tab.type,
          isNewUnsaved: tab.isNewUnsaved,
          scrollPosition: tab.scrollPosition || 0, // Save scroll position
          ...((tab.isDirty || tab.isNewUnsaved) && tab.type === 'file' && { unsavedContent: tab.content }),
        }));
        localStorage.setItem('torahIdeOpenTabs', JSON.stringify({ tabs: tabsToSave, activeTabId: activeTabPath }));
      } else {
        // If there are no open tabs, remove the item from localStorage
        localStorage.removeItem('torahIdeOpenTabs');
      }
    } catch (error) {
      console.error("Error saving tabs to localStorage:", error);
    }
  }, [openTabs, activeTabPath]);

  // Flush tabs to localStorage on page unload (beforeunload) to catch any
  // last-second edits that haven't yet propagated through the React state cycle.
  // We keep a ref that always holds the latest values so the handler is stable.
  const openTabsRef = useRef(openTabs);
  const activeTabPathRef = useRef(activeTabPath);
  useEffect(() => { openTabsRef.current = openTabs; }, [openTabs]);
  useEffect(() => { activeTabPathRef.current = activeTabPath; }, [activeTabPath]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const tabs = openTabsRef.current;
        const activeId = activeTabPathRef.current;
        if (tabs.length > 0) {
          const tabsToSave = tabs
            .filter(tab => !(tab.basePath === '__dragged__' && tab.type !== 'file'))
            .map(tab => ({
            id: tab.id,
            name: tab.name,
            basePath: tab.basePath,
            relativePath: tab.relativePath,
            type: tab.type,
            isNewUnsaved: tab.isNewUnsaved,
            scrollPosition: tab.scrollPosition || 0,
            ...((tab.isDirty || tab.isNewUnsaved) && tab.type === 'file' && { unsavedContent: tab.content }),
          }));
          localStorage.setItem('torahIdeOpenTabs', JSON.stringify({ tabs: tabsToSave, activeTabId: activeId }));
        }
      } catch (err) {
        // Swallow — can't do much in beforeunload
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // runs once — refs keep values current


  const loadFileContentForTab = useCallback(async (basePath, relativePath, tabName, tabType, lineNum = null, termToHighlight = '') => {
    const tabId = generateTabId(basePath, relativePath);

    if (basePath === '__new_unsaved__' || basePath === '__dragged__') {
      const existingTab = openTabs.find(t => t.id === tabId);
      if (existingTab) {
        setActiveTabPath(tabId);
        setMainViewMode('editor');
      }
      return;
    }

    if (!basePath || !relativePath || !tabName) {
      console.error("loadFileContentForTab: מידע חסר", { basePath, relativePath, tabName });
      setFileError("מידע חסר לטעינת הקובץ."); return;
    }

    const existingTab = openTabs.find(t => t.id === tabId);
    if (existingTab &&
      (existingTab.isDirty || // Don't reload if tab has unsaved changes
        ((tabType === 'file' && existingTab.content !== undefined && existingTab.styles !== undefined) ||
          (tabType === 'image' && existingTab.imageUrl !== undefined) ||
          (tabType === 'pdf' && existingTab.pdfUrl !== undefined) ||
          (tabType === 'audio' && existingTab.audioUrl !== undefined) ||
          (tabType === 'video' && existingTab.videoUrl !== undefined)))) {
      setActiveTabPath(tabId);
      if (lineNum !== null) setScrollToLine(lineNum); else setScrollToLine(null);
      setSearchTermToHighlightInEditor(termToHighlight);
      setMainViewMode('editor'); return;
    }

    setIsLoadingFileContent(true); setFileError(null); setScrollToLine(null);
    setSearchTermToHighlightInEditor(termToHighlight); setMainViewMode('editor');

    try {
      const result = await LocalFileSystemService.readFile(basePath, relativePath);

      if (!result.success) {
        throw new Error(result.error || 'Failed to read file');
      }

      if (tabType === 'image' || tabType === 'pdf' || tabType === 'audio' || tabType === 'video') {
        // For binary files, get as blob and create object URL
        const directoryHandle = LocalFileSystemService.directoryHandles.get(basePath);
        if (!directoryHandle) {
          throw new Error('Workspace folder not found');
        }

        const fileHandle = await LocalFileSystemService.getFileHandleByPath(directoryHandle, relativePath);
        const file = await fileHandle.getFile();
        const blobUrl = URL.createObjectURL(file);

        if (tabType === 'pdf') {
          setOpenTabs(prevTabs => prevTabs.map(t => t.id === tabId ? { ...t, pdfUrl: blobUrl, isDirty: false, type: 'pdf', isNewUnsaved: false } : t));
        } else if (tabType === 'audio') {
          setOpenTabs(prevTabs => prevTabs.map(t => t.id === tabId ? { ...t, audioUrl: blobUrl, isDirty: false, type: 'audio', isNewUnsaved: false } : t));
        } else if (tabType === 'video') {
          setOpenTabs(prevTabs => prevTabs.map(t => t.id === tabId ? { ...t, videoUrl: blobUrl, isDirty: false, type: 'video', isNewUnsaved: false } : t));
        } else {
          setOpenTabs(prevTabs => prevTabs.map(t => t.id === tabId ? { ...t, imageUrl: blobUrl, isDirty: false, type: 'image', isNewUnsaved: false } : t));
        }
        setActiveTabPath(tabId); setIsLoadingFileContent(false);

        fetchStatsFiles();
        return;
      }

      // For text files
      setOpenTabs(prevTabs => prevTabs.map(t => t.id === tabId ? { ...t, content: result.content, isDirty: false, type: 'file', isNewUnsaved: false, scrollPosition: t.scrollPosition || 0 } : t));
      setActiveTabPath(tabId);
      if (lineNum !== null) setScrollToLine(lineNum);
      // Record file usage in backend (fire-and-forget)
      fetch(`${API_BASE_URL}/record-file-use`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderName: basePath, relativePath, fileName: tabName }) }).catch(() => {});
      fetchStatsFiles();
    } catch (error) {
      console.error('שגיאה בטעינת תוכן קובץ:', error);
      setFileError(error.message);
      setOpenTabs(prevTabs => prevTabs.map(t => t.id === tabId ? { ...t, content: `שגיאה בטעינת תוכן: ${error.message}`, isDirty: false, isNewUnsaved: false } : t));
      setActiveTabPath(tabId);
    } finally {
      setIsLoadingFileContent(false);
    }
  }, [fetchStatsFiles, openTabs, setActiveTabPath, setFileError, setIsLoadingFileContent, setMainViewMode, setScrollToLine, setSearchTermToHighlightInEditor]);


  const handleFileSelect = useCallback((itemBaseFolder, fileItemFromAnywhere, lineNum = null, termToHighlightOnClick = '') => {
    const fileName = fileItemFromAnywhere.name || fileItemFromAnywhere.fileName || '';
    const relativeFilePath = fileItemFromAnywhere.path || fileItemFromAnywhere.relativePath;

    if (!itemBaseFolder || !itemBaseFolder.path || !relativeFilePath) {
      console.error("handleFileSelect: מידע חסר", { itemBaseFolder, fileItemFromAnywhere });
      alert("שגיאה: מידע חסר לפתיחת הקובץ.");
      return;
    }
    const fileItem = {
      name: fileName,
      basePath: itemBaseFolder.path,
      relativePath: relativeFilePath,
      isFolder: fileItemFromAnywhere.isFolder || false,
      type: (() => {
        const ext = path.extname(fileName).toLowerCase();
        if (SUPPORTED_PDF_EXTENSIONS_CLIENT.includes(ext)) return 'pdf';
        if (SUPPORTED_IMAGE_EXTENSIONS_CLIENT.includes(ext)) return 'image';
        if (SUPPORTED_AUDIO_EXTENSIONS_CLIENT.includes(ext)) return 'audio';
        if (SUPPORTED_VIDEO_EXTENSIONS_CLIENT.includes(ext)) return 'video';
        return fileItemFromAnywhere.type || 'file';
      })(),
    };
    if (fileItem.isFolder || !fileItem.relativePath || fileItem.type === 'folder') return;

    const tabId = generateTabId(fileItem.basePath, fileItem.relativePath);
    setMainViewMode('editor');
    const existingTabIndex = openTabs.findIndex(tab => tab.id === tabId);

    if (existingTabIndex === -1) {
      let newTabObject = {
        id: tabId, name: fileItem.name, basePath: fileItem.basePath, relativePath: fileItem.relativePath,
        type: fileItem.type, isDirty: false, isNewUnsaved: false,
        content: fileItem.type === 'file' ? undefined : null,
        imageUrl: fileItem.type === 'image' ? undefined : null,
        pdfUrl: fileItem.type === 'pdf' ? undefined : null,
        audioUrl: fileItem.type === 'audio' ? undefined : null,
        videoUrl: fileItem.type === 'video' ? undefined : null,
        scrollPosition: 0, // Initialize scroll position
      };
      setOpenTabs(prevTabs => [...prevTabs, newTabObject]);
      setActiveTabPath(tabId);
      loadFileContentForTab(fileItem.basePath, fileItem.relativePath, fileItem.name, fileItem.type, lineNum, termToHighlightOnClick || '');
    } else {
      setActiveTabPath(tabId);
      const existingTab = openTabs[existingTabIndex];
      if ((existingTab.type === 'file' && (existingTab.content === undefined || existingTab.styles === undefined)) ||
        (existingTab.type === 'image' && existingTab.imageUrl === undefined) ||
        (existingTab.type === 'pdf' && existingTab.pdfUrl === undefined) ||
        (existingTab.type === 'audio' && existingTab.audioUrl === undefined) ||
        (existingTab.type === 'video' && existingTab.videoUrl === undefined)) {
        loadFileContentForTab(existingTab.basePath, existingTab.relativePath, existingTab.name, existingTab.type, lineNum, termToHighlightOnClick || '');
      } else {
        if (lineNum !== null) setScrollToLine(lineNum); else setScrollToLine(null);
        setSearchTermToHighlightInEditor(termToHighlightOnClick || '');
      }
    }
  }, [openTabs, setOpenTabs, setActiveTabPath, loadFileContentForTab, setMainViewMode, setScrollToLine, setSearchTermToHighlightInEditor]);

  const handleTabClick = useCallback((tabId) => {
    const clickedTab = openTabs.find(tab => tab.id === tabId);
    if (!clickedTab) return;
    // activeTabPathHook.value is the App.jsx level activeTabPath
    if (activeTabPathHook && activeTabPathHook.value === tabId && activeTabPathHook.mainViewMode === 'editor') return;


    setActiveTabPath(tabId);
    setMainViewMode('editor');

    if (!clickedTab.isNewUnsaved && !clickedTab.isDirty &&
      ((clickedTab.type === 'file' && clickedTab.content === undefined) ||
        (clickedTab.type === 'image' && clickedTab.imageUrl === undefined) ||
        (clickedTab.type === 'pdf' && clickedTab.pdfUrl === undefined) ||
        (clickedTab.type === 'audio' && clickedTab.audioUrl === undefined) ||
        (clickedTab.type === 'video' && clickedTab.videoUrl === undefined))) {
      loadFileContentForTab(clickedTab.basePath, clickedTab.relativePath, clickedTab.name, clickedTab.type);
    } else {
      setScrollToLine(null);
      setSearchTermToHighlightInEditor('');
    }
  }, [openTabs, setActiveTabPath, setMainViewMode, loadFileContentForTab, setScrollToLine, setSearchTermToHighlightInEditor, activeTabPathHook]);

  const closeTabInternal = useCallback((tabIdToClose) => {
    const newOpenTabs = openTabs.filter(tab => tab.id !== tabIdToClose);
    setOpenTabs(newOpenTabs);

    // activeTabPathHook.value is the App.jsx level activeTabPath
    if (activeTabPathHook && activeTabPathHook.value === tabIdToClose) {
      setSearchTermToHighlightInEditor('');
      if (newOpenTabs.length > 0) {
        const originalTabs = openTabs;
        const closedTabIndexOriginal = originalTabs.findIndex(tab => tab.id === tabIdToClose);
        let nextActiveTabIndex = -1;

        if (closedTabIndexOriginal > 0 && closedTabIndexOriginal - 1 < newOpenTabs.length) {
          nextActiveTabIndex = closedTabIndexOriginal - 1;
        } else if (newOpenTabs.length > 0) {
          nextActiveTabIndex = Math.min(closedTabIndexOriginal, newOpenTabs.length - 1);
        }

        if (nextActiveTabIndex !== -1 && newOpenTabs[nextActiveTabIndex]) {
          const nextActiveTab = newOpenTabs[nextActiveTabIndex];
          setActiveTabPath(nextActiveTab.id);
          if (!nextActiveTab.isNewUnsaved &&
            ((nextActiveTab.type === 'file' && (nextActiveTab.content === undefined || nextActiveTab.styles === undefined)) ||
              (nextActiveTab.type === 'image' && nextActiveTab.imageUrl === undefined) ||
              (nextActiveTab.type === 'pdf' && nextActiveTab.pdfUrl === undefined))) {
            loadFileContentForTab(nextActiveTab.basePath, nextActiveTab.relativePath, nextActiveTab.name, nextActiveTab.type);
          } else {
            setMainViewMode('editor');
            setScrollToLine(null);
          }
        } else {
          setActiveTabPath(null);
          setScrollToLine(null);
        }
      } else {
        setActiveTabPath(null);
        setScrollToLine(null);
      }

      if (activeTabPathHook && activeTabPathHook.mainViewMode === 'flashcards' && activeTabPathHook.value === tabIdToClose) {
        setMainViewMode('editor');
        setFlashcardData([]);
      }
      if (activeTabPathHook && activeTabPathHook.mainViewMode === 'summary' && originalFileForSummary && generateTabId(originalFileForSummary.basePath, originalFileForSummary.relativePath) === tabIdToClose) {
        setMainViewMode('editor');
        setSummaryText('');
        setSummaryError(null);
        setOriginalFileForSummary(null);
      }
    }
  }, [openTabs, setOpenTabs, activeTabPathHook, setActiveTabPath, setSearchTermToHighlightInEditor, setMainViewMode, setScrollToLine, setFlashcardData, originalFileForSummary, setOriginalFileForSummary, setSummaryText, setSummaryError, loadFileContentForTab]);

  const handleCloseTab = useCallback((tabIdToClose, e) => {
    if (e) e.stopPropagation();
    const tabToClose = openTabs.find(tab => tab.id === tabIdToClose);
    if (tabToClose && tabToClose.isDirty && tabToClose.type === 'file') {
      const shouldConfirm = tabToClose.isNewUnsaved ? tabToClose.content && tabToClose.content.trim() !== '' : true;
      if (shouldConfirm) {
        // Show custom modal instead of browser confirm
        setUnsavedChangesModal({
          isOpen: true,
          tabToClose: tabToClose,
          isSaving: false
        });
        return;
      }
    }
    // No confirmation needed, close immediately
    closeTabInternal(tabIdToClose);
  }, [openTabs, closeTabInternal]);

  // Handle modal actions
  const handleModalSave = useCallback(async () => {
    const { tabToClose } = unsavedChangesModal;
    if (!tabToClose) return;

    setUnsavedChangesModal(prev => ({ ...prev, isSaving: true }));

    try {
      // Import the save function dynamically or pass it through props
      // For now, we'll trigger a save event and then close
      const saveEvent = new CustomEvent('saveActiveFile', {
        detail: { tabId: tabToClose.id }
      });
      window.dispatchEvent(saveEvent);

      // Wait a bit for save to complete, then close
      setTimeout(() => {
        setUnsavedChangesModal({ isOpen: false, tabToClose: null, isSaving: false });
        closeTabInternal(tabToClose.id);
      }, 500);
    } catch (error) {
      console.error('Error saving file:', error);
      setUnsavedChangesModal(prev => ({ ...prev, isSaving: false }));
    }
  }, [unsavedChangesModal, closeTabInternal]);

  const handleModalDiscard = useCallback(() => {
    const { tabToClose } = unsavedChangesModal;
    if (!tabToClose) return;

    setUnsavedChangesModal({ isOpen: false, tabToClose: null, isSaving: false });
    closeTabInternal(tabToClose.id);
  }, [unsavedChangesModal, closeTabInternal]);

  const handleModalCancel = useCallback(() => {
    setUnsavedChangesModal({ isOpen: false, tabToClose: null, isSaving: false });
  }, []);

  const handleEditorChange = useCallback((newContent) => {
    // Needs the App.jsx level activeTabPath to correctly identify which tab to update
    setOpenTabs(prevTabs => prevTabs.map(tab =>
      (tab.id === (activeTabPathHook ? activeTabPathHook.value : null) && tab.type === 'file')
        ? { ...tab, content: newContent, isDirty: true }
        : tab
    ));
  }, [activeTabPathHook, setOpenTabs]);

  const handleOpenNewTab = useCallback(() => {
    untitledCounterRef.current += 1;
    const newFileName = `Untitled-${untitledCounterRef.current}.md`;
    const newTabId = generateTabId('__new_unsaved__', newFileName);

    const newTabObject = {
      id: newTabId,
      name: newFileName,
      basePath: '__new_unsaved__', // Special marker for new, unsaved files
      relativePath: newFileName,
      type: 'file',
      content: '', // Start with empty content
      isDirty: true, // Mark as dirty immediately
      isNewUnsaved: true, // Flag to identify this tab type
      scrollPosition: 0, // Initialize scroll position
    };

    setOpenTabs(prevTabs => [...prevTabs, newTabObject]);
    setActiveTabPath(newTabId);
    setMainViewMode('editor');
    setScrollToLine(null);
    setSearchTermToHighlightInEditor('');
  }, [setOpenTabs, setActiveTabPath, setMainViewMode, setScrollToLine, setSearchTermToHighlightInEditor]);

  // Function to save scroll position for a tab
  const saveScrollPosition = useCallback((tabId, scrollPosition) => {
    setOpenTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, scrollPosition } : tab
    ));
  }, [setOpenTabs]);

  // Function to get scroll position for a tab
  const getScrollPosition = useCallback((tabId) => {
    const tab = openTabs.find(t => t.id === tabId);
    return tab ? tab.scrollPosition || 0 : 0;
  }, [openTabs]);

  return {
    openTabs,
    setOpenTabs,
    activeTabPath, // This hook's internal activeTabPath
    setActiveTabPath, // Setter for this hook's internal activeTabPath
    isLoadingFileContent,
    setIsLoadingFileContent,
    fileError,
    setFileError,
    loadFileContentForTab,
    handleFileSelect,
    handleTabClick,
    handleCloseTab,
    handleEditorChange,
    handleOpenNewTab, // Export the new function
    saveScrollPosition, // Export scroll position saving
    getScrollPosition, // Export scroll position getting
    // Modal state and handlers
    unsavedChangesModal,
    handleModalSave,
    handleModalDiscard,
    handleModalCancel,
  };
}

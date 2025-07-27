// frontend/src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import ContextMenu from './components/ContextMenu';
import './components/ContextMenu.css';
import './components/TreeItem.css';
import './components/FlashcardView.css';
import './components/SummaryView.css';
import './components/SourceResultsDisplay.css';
import './components/RepetitionListView.css';
import './components/RepetitionItem.css';
import './components/RepetitionModal.css';
import './components/TranscriptionInputModal.css';
import './components/TranscriptionResultView.css';
import './components/QuestionnaireModal.css';
import './components/LearningGraphView.css'; // Added Learning Graph CSS
import './components/MarkdownToolbar.css';
import './components/MarkdownToolbar.css'; // Import Markdown Toolbar CSS
import './components/ApiKeyModal.css'; // Import API Key Modal CSS
import './components/AiModelModal.css'; // Import AI Model Modal CSS
import './components/PilpultaDisplay.css'; // Import Pilpulta CSS
import './components/UnsavedChangesModal.css'; // Import UnsavedChangesModal CSS

import Sidebar from './components/Sidebar';
import MainContentArea from './components/MainContentArea';
import EditorToolbar from './components/EditorToolbar';
import TranscriptionInputModal from './components/TranscriptionInputModal';
import QuestionnaireButton from './components/QuestionnaireButton';
import QuestionnaireModal from './components/QuestionnaireModal';
import NotificationSettings from './components/NotificationSettings';
// WeeklySummaryDisplay is now typically shown inside MainContentArea based on viewMode
// import WeeklySummaryDisplay from './components/WeeklySummaryDisplay';
import LearningGraphButton from './components/LearningGraphButton'; // Import LearningGraphButton
import LearningGraphView from './components/LearningGraphView';   // Import LearningGraphView
import ApiKeyModal from './components/ApiKeyModal'; // Import ApiKeyModal
import AiModelModal from './components/AiModelModal'; // Import AiModelModal
import PilpultaDisplay from './components/PilpultaDisplay'; // Import PilpultaDisplay
import SmartSearchModal from './components/SmartSearchModal'; // Import SmartSearchModal
import HelpModal from './components/HelpModal'; // Import HelpModal
import UnsavedChangesModal from './components/UnsavedChangesModal'; // Import UnsavedChangesModal


import useWorkspace from './hooks/useWorkspace';
import useTabs from './hooks/useTabs'; // Removed generateTabId as it's used internally by useTabs
import useFileOperations from './hooks/useFileOperations';
import useSearch from './hooks/useSearch';
import useStats from './hooks/useStats';
import useEditorSettings from './hooks/useEditorSettings';
import useAiFeatures from './hooks/useAiFeatures';
import useRepetitions from './hooks/useRepetitions';
import useQuestionnaire from './hooks/useQuestionnaire';
import useLearningGraph from './hooks/useLearningGraph'; // Import useLearningGraph
import useJudaismChat from './hooks/useJudaismChat'; // Import useJudaismChat
import JudaismChatModal from './components/JudaismChatModal'; // Import JudaismChatModal

import path from './utils/pathUtils';
import { APP_DIRECTION, API_BASE_URL, HEBREW_TEXT, API_KEY_STORAGE_KEY, API_KEY_IS_PAID_STORAGE_KEY, DEFAULT_FONT_SIZE_PX } from './utils/constants'; // Import DEFAULT_FONT_SIZE_PX

// List of models from the screenshot - simplified to just Gemini 2.5 models
const defaultAiModels = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
];
const DEFAULT_AI_MODEL = defaultAiModels[0]; // Define default model constant
const GROUNDING_MODEL = 'gemini-1.5-pro-latest'; // Define grounding model constant

function App() {
  const [backendMessage, setBackendMessage] = useState('');
  // Initialize state based on localStorage paid status
  const [selectedAiModel, setSelectedAiModel] = useState(() => {
    const isPaid = localStorage.getItem(API_KEY_IS_PAID_STORAGE_KEY) === 'true';
    return isPaid ? GROUNDING_MODEL : DEFAULT_AI_MODEL;
  });
  
  // State for custom added models
  const [customModels, setCustomModels] = useState(() => {
    try {
      const saved = localStorage.getItem('customAiModels');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error parsing custom models from localStorage:', e);
      return [];
    }
  });
  
  // Combined models (default + custom)
  const aiModels = [...defaultAiModels, ...customModels];

  const [isZenMode, setIsZenMode] = useState(false);
  // 'editor', 'flashcards', 'summary', 'sourceResults', 'search', 'recent', 'frequent', 'repetitions', 'weeklySummary', 'notificationSettings', 'learningGraph'
  const [mainViewMode, setMainViewMode] = useState('editor');
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('');

  const [contextMenuState, setContextMenuState] = useState({
    visible: false, x: 0, y: 0, items: [], item: null, baseFolder: null
  });

  const editorSharedRef = useRef(null);
  const [appLevelActiveTabPath, setAppLevelActiveTabPath] = useState(null);

  const [isTranscriptionModalOpen, setIsTranscriptionModalOpen] = useState(false);
  const [isLearningGraphViewOpen, setIsLearningGraphViewOpen] = useState(false); // State for Learning Graph modal
  const [isJudaismChatModalOpen, setIsJudaismChatModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false); // State for API Key modal
  const [isAiModelModalOpen, setIsAiModelModalOpen] = useState(false); // State for AI Model modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false); // State for Help modal
  const [isPilpultaVisible, setIsPilpultaVisible] = useState(false); // State for Pilpulta window
  const [pilpultaData, setPilpultaData] = useState([]); // Data for Pilpulta window
  // Smart Search modal state is managed within useAiFeatures hook
  const [editorFontSize, setEditorFontSize] = useState(DEFAULT_FONT_SIZE_PX);
  
  // Font management state
  const [appFont, setAppFont] = useState('Arial');
  const [editorFont, setEditorFont] = useState('Consolas');


  // --- Initialize Hooks ---
  const workspaceHook = useWorkspace(setGlobalLoadingMessage);
  const statsHook = useStats({ workspaceFolders: workspaceHook.workspaceFolders });
  const repetitionsHook = useRepetitions(setGlobalLoadingMessage);
  const questionnaireHook = useQuestionnaire(setGlobalLoadingMessage); // Pass setGlobalLoadingMessage
  const learningGraphHook = useLearningGraph(); // Initialize Learning Graph Hook
  const judaismChatHook = useJudaismChat({ setGlobalLoadingMessage, selectedAiModel }); // Pass selected model

  const handleEditorFontSizeChange = (newSize) => {
    setEditorFontSize(newSize);
    // Persist to localStorage if desired
    localStorage.setItem('editorFontSize', newSize);
  };
  
  const handleAppFontChange = (newFont) => {
    setAppFont(newFont);
    localStorage.setItem('appFont', newFont);
    // Apply font to the entire app
    document.documentElement.style.setProperty('--app-font-family', newFont);
  };
  
  const handleEditorFontChange = (newFont) => {
    setEditorFont(newFont);
    localStorage.setItem('editorFont', newFont);
    // Apply font to editor
    document.documentElement.style.setProperty('--editor-font-family', newFont);
  };

  // Load font size from localStorage on initial mount if needed
  useEffect(() => {
    const savedFontSize = localStorage.getItem('editorFontSize');
    if (savedFontSize) {
      setEditorFontSize(parseInt(savedFontSize, 10));
    }
    
    // Load saved fonts
    const savedAppFont = localStorage.getItem('appFont');
    const savedEditorFont = localStorage.getItem('editorFont');
    
    if (savedAppFont) {
      setAppFont(savedAppFont);
      document.documentElement.style.setProperty('--app-font-family', savedAppFont);
    }
    
    if (savedEditorFont) {
      setEditorFont(savedEditorFont);
      document.documentElement.style.setProperty('--editor-font-family', savedEditorFont);
    }
  }, []);


  const resetFrontendStateForUserDataDelete = () => {
    workspaceHook.setWorkspaceFolders([]);
    tabsHook.setOpenTabs([]);
    setAppLevelActiveTabPath(null);
    // Clear relevant localStorage items
    localStorage.removeItem('lastOpenedFolderPaths'); // This is also cleared server-side but good to do client-side too
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(API_KEY_IS_PAID_STORAGE_KEY);
    localStorage.removeItem('selectedAiModel'); // If you store this
    localStorage.removeItem('customAiModels'); // Clear custom AI models
    localStorage.removeItem('editorSettings'); // Example, if you store editor settings
    // Add any other localStorage keys that store user-specific data
    
    // Optionally, clear other states if they hold user data not covered by hooks
    // e.g., searchHook.setSearchTerm(''); searchHook.setSearchResults([]);
    
    console.log("Frontend state cleared for user data deletion.");
    // Reload the application to ensure a fresh start
    window.location.reload();
  };

  // --- Pilpulta State Management ---
  const showPilpulta = useCallback((data) => {
    setPilpultaData(data);
    setIsPilpultaVisible(true);
  }, []);

  const hidePilpulta = useCallback(() => {
    setIsPilpultaVisible(false);
    // Optionally clear data when hiding: setPilpultaData([]);
  }, []);


  const initialAiFeaturesPlaceholders = {
    setFlashcardData: () => {},
    originalFileForSummary: () => null,
    setOriginalFileForSummary: () => {},
    setSummaryText: () => {},
    setSummaryError: () => {},
    setSourceFindingResults: () => {},
    originalFileForSourceFinding: () => null,
    setOriginalFileForSourceFinding: () => {},
    setSourceFindingError: () => {},
    setPilpultaData: () => {}, // Placeholder
    setPilpultaError: () => {}, // Placeholder
    // Smart Search placeholders (if needed before hook initializes, though hook manages its own state)
    isSmartSearchModalOpen: false,
    smartSearchResults: null,
    isLoadingSmartSearch: false,
    smartSearchError: null,
    openSmartSearchModal: () => {},
    closeSmartSearchModal: () => {},
    performSmartSearch: async () => {},
  };

  const initialSearchPlaceholders = {
    setSearchTermToHighlightInEditor: () => {},
    searchInputRef: {current: null},
  };

  const initialEditorSettingsPlaceholders = {
      setScrollToLine: () => {},
      highlightActiveLine: true,
      showLineNumbers: true,
  };


  const tabsHook = useTabs({
    fetchStatsFiles: statsHook.fetchStatsFiles,
    setMainViewMode,
    activeTabPathHook: { value: appLevelActiveTabPath, setter: setAppLevelActiveTabPath, mainViewMode: mainViewMode },
    setFlashcardData: (data) => aiFeaturesHook?.setFlashcardData(data),
    originalFileForSummary: () => aiFeaturesHook?.originalFileForSummary,
    setOriginalFileForSummary: (file) => aiFeaturesHook?.setOriginalFileForSummary(file),
    setSummaryText: (text) => aiFeaturesHook?.setSummaryText(text),
    setSummaryError: (error) => aiFeaturesHook?.setSummaryError(error),
    setScrollToLine: (line) => editorSettingsHook?.setScrollToLine(line),
    setSearchTermToHighlightInEditor: (term) => searchHook?.setSearchTermToHighlightInEditor(term),
    setSourceFindingResults: (text) => aiFeaturesHook?.setSourceFindingResults(text),
    originalFileForSourceFinding: () => aiFeaturesHook?.originalFileForSourceFinding,
    setOriginalFileForSourceFinding: (file) => aiFeaturesHook?.setOriginalFileForSourceFinding(file),
    setSourceFindingError: (error) => aiFeaturesHook?.setSourceFindingError(error),
  });

  useEffect(() => {
    if (tabsHook.activeTabPath !== appLevelActiveTabPath) {
      setAppLevelActiveTabPath(tabsHook.activeTabPath);
    }
  }, [tabsHook.activeTabPath, appLevelActiveTabPath]);


  const activeTabObject = appLevelActiveTabPath ? tabsHook.openTabs.find(t => t.id === appLevelActiveTabPath) : null;

  const editorSettingsHook = useEditorSettings({
    activeTabObject,
    editorSharedRef,
    setOpenTabs: tabsHook.setOpenTabs,
  });

  const fileOperationsHook = useFileOperations({
    openTabs: tabsHook.openTabs,
    activeTabPath: appLevelActiveTabPath,
    setOpenTabs: tabsHook.setOpenTabs,
    setActiveTabPathApp: setAppLevelActiveTabPath,
    workspaceFolders: workspaceHook.workspaceFolders,
    updateWorkspaceFolderStructure: workspaceHook.updateWorkspaceFolderStructure,
    handleFileSelect: tabsHook.handleFileSelect,
    handleCloseTab: tabsHook.handleCloseTab,
    fetchStatsFiles: statsHook.fetchStatsFiles,
    setGlobalLoadingMessage,
  });

  const searchHook = useSearch({
    workspaceFolders: workspaceHook.workspaceFolders,
    setGlobalLoadingMessage,
    setMainViewMode,
  });

  useEffect(() => {
    // console.log('workspaceFolders changed:', workspaceHook.workspaceFolders); // Less noisy log
  }, [workspaceHook.workspaceFolders]);

  const aiFeaturesHook = useAiFeatures({
    activeTabObject,
    setMainViewMode,
    handleCreateNewFileOrSummary: fileOperationsHook.handleCreateNewFileOrSummary,
    setGlobalLoadingMessage,
    workspaceFolders: workspaceHook.workspaceFolders,
    selectedAiModel, // Pass selected model
    showPilpulta, // Pass the function to show the Pilpulta window
  });

  // --- Effects & Callbacks ---
  useEffect(() => {
    fetch(`${API_BASE_URL}/hello`)
      .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
      .then(data => setBackendMessage(data.message))
      .catch(err => console.warn("לא ניתן להתחבר לשרת לקבלת הודעת 'hello':", err.message));
  }, []);

  useEffect(() => {
    const previousWorkspaceFolders = JSON.stringify(workspaceHook.workspaceFolders.map(f => f.path).sort());

    return () => {
        const currentWorkspaceFolders = workspaceHook.workspaceFolders;
        const currentWorkspaceFolderPaths = currentWorkspaceFolders.map(f => f.path).sort();

        if (previousWorkspaceFolders !== JSON.stringify(currentWorkspaceFolderPaths)) {
            const prevPathsSet = new Set(JSON.parse(previousWorkspaceFolders));
            const currentPathsSet = new Set(currentWorkspaceFolderPaths);
            const removedFolderPaths = [...prevPathsSet].filter(p => !currentPathsSet.has(p));

            if (removedFolderPaths.length > 0) {
                removedFolderPaths.forEach(removedPath => {
                    const tabsToClose = tabsHook.openTabs.filter(tab => tab.basePath === removedPath);
                    tabsToClose.forEach(tab => tabsHook.handleCloseTab(tab.id, null));

                    if (searchHook.currentSearchScope.basePath === removedPath) {
                        searchHook.setCurrentSearchScope({ basePath: null, relativePath: null, name: null });
                        searchHook.setSearchResults([]);
                        searchHook.setSearchError(HEBREW_TEXT.folderRemovedSearchScopeCleared);
                    }
                });
            }
        }
    };
  }, [workspaceHook.workspaceFolders, tabsHook.openTabs, tabsHook.handleCloseTab, searchHook.currentSearchScope, searchHook.setCurrentSearchScope, searchHook.setSearchResults, searchHook.setSearchError]);


  const handleActualRemoveWorkspaceFolder = async (folderPathToRemove) => {
    const removedPath = await workspaceHook.removeWorkspaceFolder(folderPathToRemove);
    if (removedPath) {
        const tabsToClose = tabsHook.openTabs.filter(tab => tab.basePath === removedPath);
        tabsToClose.forEach(tab => tabsHook.handleCloseTab(tab.id, null));

        if (searchHook.currentSearchScope.basePath === removedPath) {
            searchHook.setCurrentSearchScope({ basePath: null, relativePath: null, name: null });
            searchHook.setSearchResults([]);
            searchHook.setSearchError(HEBREW_TEXT.folderRemovedSearchScopeCleared);
            if (searchHook.searchTerm.trim() && workspaceHook.workspaceFolders.length > 0) {
                searchHook.handleSearch();
            } else if (workspaceHook.workspaceFolders.length === 0) {
                searchHook.setSearchTermToHighlightInEditor('');
            }
        }
    }
  };


  const toggleZenMode = () => setIsZenMode(prev => !prev);

  const handleToggleMainView = useCallback((viewType) => {
    // Added 'learningGraph' to the list of views that don't toggle back to editor on second click
    if (mainViewMode === viewType && !['flashcards', 'summary', 'sourceResults', 'repetitions', 'weeklySummary', 'learningGraph'].includes(viewType)) {
      setMainViewMode('editor');
    } else {
      setMainViewMode(viewType);
      if (viewType === 'recent' || viewType === 'frequent') statsHook.fetchStatsFiles();
      if (viewType === 'search' && searchHook.searchInputRef.current) {
        setTimeout(() => searchHook.searchInputRef.current?.focus(), 0);
      }
      if (viewType === 'repetitions') {
        repetitionsHook.fetchRepetitions();
      }
      if (viewType === 'weeklySummary') {
        questionnaireHook.fetchLatestWeeklySummary();
      }
      if (viewType === 'learningGraph') { // Fetch data if opening learning graph
        // Let the LearningGraphView component handle its own data fetching via its hook
      }
      // Cleanup AI feature states
      if (viewType !== 'flashcards' && mainViewMode === 'flashcards') {
        aiFeaturesHook.setFlashcardData([]); aiFeaturesHook.setFlashcardError(null);
      }
      if (viewType !== 'summary' && mainViewMode === 'summary') {
        aiFeaturesHook.setSummaryText(''); aiFeaturesHook.setSummaryError(null); aiFeaturesHook.setOriginalFileForSummary(null);
      }
      if (viewType !== 'sourceResults' && mainViewMode === 'sourceResults') {
        aiFeaturesHook.setSourceFindingResults(''); aiFeaturesHook.setSourceFindingError(null); aiFeaturesHook.setOriginalFileForSourceFinding(null);
      }
      // No need to automatically close Pilpulta window when changing main view
    }
  }, [mainViewMode, statsHook.fetchStatsFiles, searchHook.searchInputRef, aiFeaturesHook, repetitionsHook, questionnaireHook, learningGraphHook]);


  const handleCloseContextMenu = () => {
    setContextMenuState(prev => ({ ...prev, visible: false }));
  };

  const handleContextMenuRequest = useCallback((event, item, baseFolder) => {
    event.preventDefault();
    event.stopPropagation();
    const menuItems = [];
    menuItems.push({
      label: HEBREW_TEXT.rename,
      action: () => workspaceHook.startRenameInExplorerUI(item, baseFolder)
    });
    if (item.isFolder) {
      menuItems.push({
        label: HEBREW_TEXT.newFile + "...",
        action: () => fileOperationsHook.createNewFileFromExplorer(item, baseFolder)
      });
      menuItems.push({
        label: HEBREW_TEXT.newFolder + "...",
        action: () => fileOperationsHook.createNewFolderFromExplorer(item, baseFolder)
      });
    }
    menuItems.push({ type: 'separator' });
    menuItems.push({
      label: HEBREW_TEXT.deleteItem,
      action: () => fileOperationsHook.deleteItemFromExplorer(item, baseFolder)
    });
    menuItems.push({type: 'separator'});
    menuItems.push({
        label: `${HEBREW_TEXT.searchIn(item.isFolder ? 'תיקייה זו' : 'קובץ זה')}...`,
        action: () => searchHook.handleSetSearchScopeAndTriggerSearch(baseFolder, item.path, item.name)
    });

    setContextMenuState({
      visible: true, x: event.clientX, y: event.clientY,
      items: menuItems, item: item, baseFolder: baseFolder
    });
  }, [workspaceHook.startRenameInExplorerUI, fileOperationsHook, searchHook, setContextMenuState]);


  const handleCreateNewFileAction = useCallback(async () => {
    if (workspaceHook.workspaceFolders.length === 0) { alert(HEBREW_TEXT.addFolderFirst); return; }
    let targetBaseFolderPath = null;
    let targetBaseFolderForPrompt = null;

    const currentActiveTab = activeTabObject;
    if (currentActiveTab && currentActiveTab.basePath) {
      targetBaseFolderPath = currentActiveTab.basePath;
      targetBaseFolderForPrompt = workspaceHook.workspaceFolders.find(wf => wf.path === targetBaseFolderPath);
    } else if (workspaceHook.workspaceFolders.length === 1) {
      targetBaseFolderPath = workspaceHook.workspaceFolders[0].path;
      targetBaseFolderForPrompt = workspaceHook.workspaceFolders[0];
    } else {
      const folderNames = workspaceHook.workspaceFolders.map((wf, idx) => `${idx + 1}. ${wf.name} (${wf.path})`).join('\n');
      const choice = prompt(HEBREW_TEXT.chooseTargetFolderPrompt(folderNames));
      if (choice === null || choice.trim() === '') return;
      const choiceIndex = parseInt(choice.trim(), 10) - 1;
      if (workspaceHook.workspaceFolders[choiceIndex]) {
        targetBaseFolderPath = workspaceHook.workspaceFolders[choiceIndex].path;
        targetBaseFolderForPrompt = workspaceHook.workspaceFolders[choiceIndex];
      } else {
        alert(HEBREW_TEXT.invalidChoice); return;
      }
    }
    if (!targetBaseFolderPath || !targetBaseFolderForPrompt) { alert(HEBREW_TEXT.noTargetFolder); return; }
    await fileOperationsHook.createNewFileFromExplorer(null, targetBaseFolderForPrompt);
  }, [workspaceHook.workspaceFolders, activeTabObject, fileOperationsHook.createNewFileFromExplorer]);

  const handleDeleteActiveFileAction = useCallback(async () => {
    const currentActiveTab = activeTabObject;
    if (!currentActiveTab || !currentActiveTab.basePath || mainViewMode !== 'editor') {
      alert(HEBREW_TEXT.noActiveFileToDelete); return;
    }
    const baseFolder = workspaceHook.workspaceFolders.find(wf => wf.path === currentActiveTab.basePath);
    if (!baseFolder) {
      alert(HEBREW_TEXT.error + ": לא נמצאה תיקיית הבסיס של הקובץ הפעיל."); return;
    }
    const itemToDelete = {
      name: currentActiveTab.name, path: currentActiveTab.relativePath,
      isFolder: false, type: currentActiveTab.type
    };
    await fileOperationsHook.deleteItemFromExplorer(itemToDelete, baseFolder);
  }, [activeTabObject, mainViewMode, workspaceHook.workspaceFolders, fileOperationsHook.deleteItemFromExplorer]);

  // Scroll position handlers
  const handleScrollPositionChange = useCallback((scrollPosition) => {
    if (appLevelActiveTabPath) {
      tabsHook.saveScrollPosition(appLevelActiveTabPath, scrollPosition);
    }
  }, [appLevelActiveTabPath, tabsHook]);

  const getCurrentScrollPosition = useCallback(() => {
    if (appLevelActiveTabPath) {
      return tabsHook.getScrollPosition(appLevelActiveTabPath);
    }
    return 0;
  }, [appLevelActiveTabPath, tabsHook]);

  // Add event listener for save requests from modal
  useEffect(() => {
    const handleSaveActiveFile = (event) => {
      const { tabId } = event.detail;
      if (tabId && appLevelActiveTabPath === tabId) {
        fileOperationsHook.handleSaveFile();
      }
    };

    window.addEventListener('saveActiveFile', handleSaveActiveFile);
    return () => window.removeEventListener('saveActiveFile', handleSaveActiveFile);
  }, [appLevelActiveTabPath, fileOperationsHook.handleSaveFile]);

  const clearSearchScopeAndRelatedState = () => {
    searchHook.setCurrentSearchScope({ basePath: null, relativePath: null, name: null });
    if (searchHook.searchTerm.trim()) {
        searchHook.handleSearch();
    } else {
        searchHook.setSearchResults([]);
        searchHook.setSearchError(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      // Handle Ctrl+S (English) and Ctrl+ד (Hebrew) for save
      if (isCtrlOrMeta && (event.key.toLowerCase() === 's' || event.key.toLowerCase() === 'ד')) {
        event.preventDefault();
        if (appLevelActiveTabPath && mainViewMode === 'editor') {
          const activeTab = tabsHook.openTabs.find(t => t.id === appLevelActiveTabPath);
          if (event.shiftKey || (activeTab && activeTab.isNewUnsaved)) {
            fileOperationsHook.handleSaveFile(true); // True for "Save As"
          } else {
            fileOperationsHook.handleSaveFile(); // False or undefined for normal save
          }
        }
      }
      // Zen mode toggle with Ctrl+Q (English) or Ctrl+ק (Hebrew)
      if (isCtrlOrMeta && (event.key.toLowerCase() === 'q' || event.key === '/' || event.key === 'ק')) {
        event.preventDefault();
        toggleZenMode();
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z') { // Note: Typically Ctrl+Z is Undo, Ctrl+Y or Ctrl+Shift+Z is Redo. This is for Zen Mode.
        event.preventDefault(); toggleZenMode();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (mainViewMode !== 'search') handleToggleMainView('search');
        else setTimeout(() => searchHook.searchInputRef.current?.focus(), 0);
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        setIsJudaismChatModalOpen(prev => !prev);
      }
      if (event.key === 'Escape') {
         // Order of closing: Most specific/top-level modals first
        if (tabsHook.unsavedChangesModal.isOpen) tabsHook.handleModalCancel();
        else if (aiFeaturesHook.isSmartSearchModalOpen) aiFeaturesHook.closeSmartSearchModal();
        else if (isPilpultaVisible) hidePilpulta();
        else if (isJudaismChatModalOpen) setIsJudaismChatModalOpen(false);
        else if (isAiModelModalOpen) setIsAiModelModalOpen(false);
        else if (isApiKeyModalOpen) setIsApiKeyModalOpen(false);
        else if (isHelpModalOpen) setIsHelpModalOpen(false);
        else if (isLearningGraphViewOpen) setIsLearningGraphViewOpen(false);
        else if (questionnaireHook.isModalOpen) questionnaireHook.closeQuestionnaireModal();
        else if (questionnaireHook.showNotificationSettings) questionnaireHook.setShowNotificationSettings(false);
        else if (isTranscriptionModalOpen) handleCloseTranscriptionModal();
        else if (contextMenuState.visible) handleCloseContextMenu();
        else if (['flashcards', 'summary', 'sourceResults', 'repetitions', 'weeklySummary', 'learningGraph'].includes(mainViewMode)) {
          handleToggleMainView('editor');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
      appLevelActiveTabPath, mainViewMode, fileOperationsHook.handleSaveFile, toggleZenMode,
      searchHook.searchInputRef, contextMenuState.visible, handleCloseContextMenu,
      handleToggleMainView, isTranscriptionModalOpen,
      questionnaireHook.isModalOpen, questionnaireHook.closeQuestionnaireModal,
      questionnaireHook.showNotificationSettings, questionnaireHook.setShowNotificationSettings,
      isLearningGraphViewOpen, setIsLearningGraphViewOpen,
      isJudaismChatModalOpen, setIsJudaismChatModalOpen,
      isAiModelModalOpen, setIsAiModelModalOpen,
      isApiKeyModalOpen, setIsApiKeyModalOpen,
      isHelpModalOpen, setIsHelpModalOpen,
      isPilpultaVisible, hidePilpulta, // Added Pilpulta escape handling
      aiFeaturesHook.isSmartSearchModalOpen, aiFeaturesHook.closeSmartSearchModal, // Added Smart Search escape
      tabsHook.unsavedChangesModal.isOpen, tabsHook.handleModalCancel, // Added UnsavedChanges modal escape
  ]);

  // Add event listener for save requests from modal
  useEffect(() => {
    const handleSaveActiveFile = (event) => {
      const { tabId } = event.detail;
      if (tabId && appLevelActiveTabPath === tabId) {
        fileOperationsHook.handleSaveFile();
      }
    };

    window.addEventListener('saveActiveFile', handleSaveActiveFile);
    return () => window.removeEventListener('saveActiveFile', handleSaveActiveFile);
  }, [appLevelActiveTabPath, fileOperationsHook.handleSaveFile]);

  // --- Transcription Modal Handlers ---
  const handleOpenTranscriptionModal = () => {
    aiFeaturesHook.setProcessedText("");
    aiFeaturesHook.setProcessingError(null);
    setIsTranscriptionModalOpen(true);
  };

  const handleCloseTranscriptionModal = () => {
    setIsTranscriptionModalOpen(false);
  };

  const handleSubmitTranscriptionToAi = async (text, operation) => {
    await aiFeaturesHook.processTranscription(text, operation);
  };

  const handleSaveProcessedTextFromModal = async (textToSave, mode) => {
    const success = await aiFeaturesHook.saveProcessedText(textToSave, mode);
    if (success) {
      return true;
    }
    return false;
  };

  const handleClearProcessedTextForModal = () => {
      aiFeaturesHook.setProcessedText('');
      aiFeaturesHook.setProcessingError(null);
  };

  // --- Learning Graph Modal Handlers ---
  const handleOpenLearningGraph = () => {
    setIsLearningGraphViewOpen(true);
    // Data fetching is handled by LearningGraphView component itself
  };

  const handleCloseLearningGraph = () => {
    setIsLearningGraphViewOpen(false);
  };

  // --- Judaism Chat Modal Handlers ---
  const handleOpenJudaismChatModal = () => {
    setIsJudaismChatModalOpen(true);
  };

  const handleCloseJudaismChatModal = () => {
    setIsJudaismChatModalOpen(false);
  };

  // --- API Key Modal Handlers ---
  const handleOpenApiKeyModal = () => {
    setIsApiKeyModalOpen(true);
  };

  const handleCloseApiKeyModal = () => {
    setIsApiKeyModalOpen(false);
    // Check and update model when API key modal closes
    const isPaid = localStorage.getItem(API_KEY_IS_PAID_STORAGE_KEY) === 'true';
    if (isPaid) {
      setSelectedAiModel(GROUNDING_MODEL);
      console.log(`API Key is paid. Automatically selected model: ${GROUNDING_MODEL}`);
    } else {
      // Revert to default if the current selection was the grounding model
      // Or keep the user's manual selection if it wasn't the grounding model
      setSelectedAiModel(prevModel => prevModel === GROUNDING_MODEL ? DEFAULT_AI_MODEL : prevModel);
      console.log(`API Key is not paid. Reverted/kept model: ${selectedAiModel}`); // Log current state value
    }
  };

  // --- AI Model Modal Handlers ---
  const handleOpenAiModelModal = () => {
    setIsAiModelModalOpen(true);
  };

  const handleCloseAiModelModal = () => {
    setIsAiModelModalOpen(false);
  };

  // --- Help Modal Handlers ---
  const handleOpenHelpModal = () => {
    setIsHelpModalOpen(true);
  };

  const handleCloseHelpModal = () => {
    setIsHelpModalOpen(false);
  };

  const handleSelectAiModel = (model) => {
    setSelectedAiModel(model);
    // Store the selected model in localStorage
    localStorage.setItem('selectedAiModel', model);
    // No need to close here, modal component does it onClick
  };
  
  const handleAddCustomModel = (modelName) => {
    if (!modelName || defaultAiModels.includes(modelName) || customModels.includes(modelName)) {
      return; // Don't add if empty, already in default list, or already added as custom
    }
    
    const updatedCustomModels = [...customModels, modelName];
    setCustomModels(updatedCustomModels);
    
    // Store the updated custom models in localStorage
    localStorage.setItem('customAiModels', JSON.stringify(updatedCustomModels));
  };


  const isAnyModalOpen = isTranscriptionModalOpen || questionnaireHook.isModalOpen || questionnaireHook.showNotificationSettings || isLearningGraphViewOpen || isJudaismChatModalOpen || isApiKeyModalOpen || isAiModelModalOpen || isHelpModalOpen || isPilpultaVisible || aiFeaturesHook.isSmartSearchModalOpen || tabsHook.unsavedChangesModal.isOpen; // Added UnsavedChangesModal
  const isAnyAiLoading = aiFeaturesHook.isLoadingFlashcards || aiFeaturesHook.isLoadingSummary || aiFeaturesHook.isLoadingSourceFinding || aiFeaturesHook.isProcessingText || judaismChatHook.isJudaismChatLoading || aiFeaturesHook.isLoadingPilpulta || aiFeaturesHook.isLoadingSmartSearch; // Added Smart Search loading
  const isEditorToolbarDisabled = isAnyAiLoading || !!globalLoadingMessage || isAnyModalOpen;
  const isGlobalActionDisabled = !!globalLoadingMessage || isAnyModalOpen;


  return (
    <div className="app-container">
      {globalLoadingMessage && (
        <div style={{
          position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#2c5282', color: 'white', padding: '8px 15px',
          borderRadius: '4px', zIndex: 2000, /* fontSize removed */ boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          {globalLoadingMessage}
        </div>
      )}
      {contextMenuState.visible && (
        <ContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          menuItems={contextMenuState.items}
          onClose={handleCloseContextMenu}
          item={contextMenuState.item}
          baseFolder={contextMenuState.baseFolder}
        />
      )}
      {/* Header-like section - can be extracted to its own component later if needed */}
      <div style={{ padding: '10px 15px', borderBottom: `1px solid var(--theme-border-color)`, backgroundColor: `var(--theme-bg-secondary)`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, /* fontSize removed */ color: `var(--theme-text-primary)`, whiteSpace: 'nowrap' }}>{HEBREW_TEXT.appName}</h1>
          {!isZenMode && (
            <>
              {/* Changed btn-primary to btn and removed inline style */}
              <button className="btn" onClick={handleCreateNewFileAction} disabled={workspaceHook.workspaceFolders.length === 0 || workspaceHook.isAddingFolder || isGlobalActionDisabled} title={HEBREW_TEXT.createNewFileGlobal}>{HEBREW_TEXT.newFile}</button>
              {/* Save button */}
              <button className="btn" onClick={() => fileOperationsHook.handleSaveFile()} disabled={!appLevelActiveTabPath || tabsHook.isLoadingFileContent || mainViewMode !== 'editor' || isGlobalActionDisabled} title={HEBREW_TEXT.save}>שמור</button>
              {/* Changed btn-danger to btn */}
              <button className="btn" onClick={handleDeleteActiveFileAction} disabled={!appLevelActiveTabPath || tabsHook.isLoadingFileContent || mainViewMode !== 'editor' || isGlobalActionDisabled} title={HEBREW_TEXT.deleteActiveFile}>{HEBREW_TEXT.deleteItem}</button>

              {mainViewMode === 'editor' && activeTabObject && activeTabObject.type === 'file' && (
                <>
                  {/* Removed inline background/border styles */}
                  <button className="btn" onClick={aiFeaturesHook.generateFlashcards} disabled={isEditorToolbarDisabled || aiFeaturesHook.isLoadingFlashcards} title={HEBREW_TEXT.generateFlashcards}>
                    {aiFeaturesHook.isLoadingFlashcards ? HEBREW_TEXT.generatingFlashcards : HEBREW_TEXT.generateFlashcards}
                  </button>
                  {/* Changed btn-primary to btn and removed inline style */}
                  <button className="btn" onClick={aiFeaturesHook.generateSummary} disabled={isEditorToolbarDisabled || aiFeaturesHook.isLoadingSummary} title={HEBREW_TEXT.generateSummary}>
                    {aiFeaturesHook.isLoadingSummary ? HEBREW_TEXT.generatingSummary : HEBREW_TEXT.generateSummary}
                  </button>
                </>
              )}
              {(mainViewMode === 'flashcards' || mainViewMode === 'summary' || mainViewMode === 'sourceResults' || mainViewMode === 'repetitions' || mainViewMode === 'weeklySummary' || mainViewMode === 'learningGraph') && (
                <button className="btn" onClick={() => handleToggleMainView('editor')} title={HEBREW_TEXT.returnToEditor} disabled={isGlobalActionDisabled}>
                  {HEBREW_TEXT.returnToEditor}
                </button>
              )}
              <QuestionnaireButton
                onClick={() => questionnaireHook.openQuestionnaireModal()} // Opens for today by default
                disabled={isGlobalActionDisabled || questionnaireHook.isLoadingQuestionnaire}
                notificationActive={questionnaireHook.shouldShowReminderIcon}
              />
              <LearningGraphButton
                onClick={handleOpenLearningGraph}
                disabled={isGlobalActionDisabled || learningGraphHook.isLoadingGraph}
              />

              {/* --- AI Model Selection Button --- */}
              <button
                className="btn"
                onClick={handleOpenAiModelModal}
                disabled={isGlobalActionDisabled}
                title={HEBREW_TEXT.selectAiModelTitle || "בחר מודל בינה מלאכותית"}
              >
                {HEBREW_TEXT.selectAiModelButton || "בחר מודל AI"} ({selectedAiModel})
              </button>
              {/* --- END AI Model Selection Button --- */}

              {/* Add API Key Button Here */}
              <button
                className="btn"
                onClick={handleOpenApiKeyModal}
                disabled={isGlobalActionDisabled}
                title={HEBREW_TEXT.geminiApiKeyModalTitle}
              >
                {HEBREW_TEXT.geminiApiKeyButton}
              </button>
              
              {/* Help Button */}
              <button
                className="btn"
                onClick={handleOpenHelpModal}
                disabled={isGlobalActionDisabled}
                title={HEBREW_TEXT.helpButtonTooltip}
              >
                {HEBREW_TEXT.helpButton}
              </button>
              
              <button
                onClick={() => questionnaireHook.setShowNotificationSettings(true)}
                disabled={isGlobalActionDisabled}
                title={HEBREW_TEXT.questionnaire.manageNotificationsButton}
                className="btn btn-icon" // Using btn-icon for the gear
                style={{ /* fontSize removed */ }}
                >
                ⚙️
              </button>
            </>
          )}
          {workspaceHook.addFolderError && !isZenMode && <span style={{ color: '#fc8181', marginLeft: '10px', /* fontSize removed */ }}>{HEBREW_TEXT.addFolderError}: {workspaceHook.addFolderError}</span>}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          {/* Removed conditional btn-primary/btn-subtle, always use btn */}
          <button className={`btn`} onClick={editorSettingsHook.toggleHighlightActiveLine} disabled={isAnyModalOpen} title={HEBREW_TEXT.toggleHighlightLine(editorSettingsHook.highlightActiveLine)}>{editorSettingsHook.highlightActiveLine ? 'שורה ✓' : 'שורה ✕'}</button>
          {/* Removed conditional btn-primary/btn-subtle, always use btn */}
          <button className={`btn`} onClick={editorSettingsHook.toggleShowLineNumbers} disabled={isAnyModalOpen} title={HEBREW_TEXT.toggleLineNumbers(editorSettingsHook.showLineNumbers)}>{editorSettingsHook.showLineNumbers ? 'מספרים ✓' : 'מספרים ✕'}</button>
          {/* Keep Zen mode toggle as is for now, unless user wants it changed too */}
          <button className={`btn ${isZenMode ? 'btn-primary' : 'btn-subtle'}`} onClick={toggleZenMode} disabled={isAnyModalOpen} title={HEBREW_TEXT.zenMode(isZenMode)}>{isZenMode ? 'Zen ✓' : 'Zen ✕'}</button>
        </div>
      </div>

      {mainViewMode === 'editor' && !isZenMode && (
          <EditorToolbar
            onFindSources={aiFeaturesHook.findJewishSources}
            isFindingSources={aiFeaturesHook.isLoadingSourceFinding}
            isAiFeaturesActive={isEditorToolbarDisabled || aiFeaturesHook.isLoadingPilpulta || aiFeaturesHook.isLoadingSmartSearch} // Disable toolbar during Pilpulta/SmartSearch loading too
            onOpenTranscriptionModal={handleOpenTranscriptionModal}
            onGeneratePilpulta={aiFeaturesHook.generatePilpulta} // Pass Pilpulta handler
            onOpenSmartSearchModal={aiFeaturesHook.openSmartSearchModal} // Pass Smart Search handler
            editorFontSize={editorFontSize} // Pass down font size
            onEditorFontSizeChange={handleEditorFontSizeChange} // Pass down handler
            appFont={appFont} // Pass app font
            editorFont={editorFont} // Pass editor font
            onAppFontChange={handleAppFontChange} // Pass app font change handler
            onEditorFontChange={handleEditorFontChange} // Pass editor font change handler
            handleToggleMainView={handleToggleMainView} // Pass function to toggle main view
            mainViewMode={mainViewMode} // Pass current main view mode
            activeTabObject={activeTabObject} // Pass active tab object to check file type
            repetitionsHook={repetitionsHook} // Pass repetitions hook for notifications
          />
      )}

      {/* This div will now use the .app-layout class */}
      <div className="app-layout">
        {!isZenMode && (
          <Sidebar
            className="sidebar" // Added class
            workspaceFolders={workspaceHook.workspaceFolders}
            folderPathInput={workspaceHook.folderPathInput}
            setFolderPathInput={workspaceHook.setFolderPathInput}
            handleAddFolder={workspaceHook.addWorkspaceFolder}
            isAddingFolder={workspaceHook.isAddingFolder}
            addFolderError={workspaceHook.addFolderError}
            mainViewMode={mainViewMode}
            handleToggleMainView={handleToggleMainView}
            handleFileSelect={tabsHook.handleFileSelect}
            currentSearchScope={searchHook.currentSearchScope}
            searchTerm={searchHook.searchTerm}
            setSearchTerm={searchHook.setSearchTerm}
            handleSearch={searchHook.handleSearch}
            isSearching={searchHook.isSearching}
            searchError={searchHook.searchError}
            setSearchError={searchHook.setSearchError}
            searchResults={searchHook.searchResults}
            setSearchResults={searchHook.setSearchResults}
            searchInputRef={searchHook.searchInputRef}
            setCurrentSearchScope={searchHook.setCurrentSearchScope}
            handleSetSearchScopeAndTriggerSearch={searchHook.handleSetSearchScopeAndTriggerSearch}
            recentFiles={statsHook.recentFiles}
            frequentFiles={statsHook.frequentFiles}
            isLoadingStats={statsHook.isLoadingStats}
            statsError={statsHook.statsError}
            fetchStatsFiles={statsHook.fetchStatsFiles}
            onContextMenuRequest={handleContextMenuRequest}
            startRenameInExplorerUI={workspaceHook.startRenameInExplorerUI}
            clearRenameFlagInExplorerUI={workspaceHook.clearRenameFlagInExplorerUI}
            renameItemInExplorer={fileOperationsHook.renameItemInExplorer}
            dropItemInExplorer={fileOperationsHook.dropItemInExplorer}
            createNewFileFromExplorer={fileOperationsHook.createNewFileFromExplorer}
            createNewFolderFromExplorer={fileOperationsHook.createNewFolderFromExplorer}
            deleteItemFromExplorer={fileOperationsHook.deleteItemFromExplorer}
            setContextMenuState={setContextMenuState}
            globalLoadingMessage={globalLoadingMessage}
            handleRemoveWorkspaceFolder={handleActualRemoveWorkspaceFolder}
            isSidebarDisabled={isAnyModalOpen}
            onOpenJudaismChat={handleOpenJudaismChatModal}
          />
        )}
        <MainContentArea
          className="main-content-area" // Added class
          mainViewMode={mainViewMode}
          openTabs={tabsHook.openTabs}
          activeTabPath={appLevelActiveTabPath}
          activeTabObject={activeTabObject}
          editorFontSize={editorFontSize} // Pass editorFontSize to MainContentArea
          editorFont={editorFont} // Pass editorFont to MainContentArea
          handleTabClick={tabsHook.handleTabClick}
          handleCloseTab={tabsHook.handleCloseTab}
          handleOpenNewTab={tabsHook.handleOpenNewTab} // Pass the new handler
          savingTabPath={fileOperationsHook.savingTabPath}
          editorSharedRef={editorSharedRef}
          isLoadingFileContent={tabsHook.isLoadingFileContent}
          fileError={tabsHook.fileError}
          handleEditorChange={tabsHook.handleEditorChange}
          searchTermToHighlightInEditor={searchHook.searchTermToHighlightInEditor}
          scrollToLine={editorSettingsHook.scrollToLine}
          showLineNumbers={editorSettingsHook.showLineNumbers}
          highlightActiveLine={editorSettingsHook.highlightActiveLine}
          initialScrollPosition={getCurrentScrollPosition()}
          onScrollPositionChange={handleScrollPositionChange}

          flashcardData={aiFeaturesHook.flashcardData}
          isLoadingFlashcards={aiFeaturesHook.isLoadingFlashcards}
          flashcardError={aiFeaturesHook.flashcardError}
          setMainViewMode={setMainViewMode}
          generateFlashcards={aiFeaturesHook.generateFlashcards}

          summaryText={aiFeaturesHook.summaryText}
          isLoadingSummary={aiFeaturesHook.isLoadingSummary}
          summaryError={aiFeaturesHook.summaryError}
          saveSummary={aiFeaturesHook.saveSummary}
          discardSummary={aiFeaturesHook.discardSummary}
          generateSummary={aiFeaturesHook.generateSummary}

          sourceFindingResults={aiFeaturesHook.sourceFindingResults}
          isLoadingSourceFinding={aiFeaturesHook.isLoadingSourceFinding}
          sourceFindingError={aiFeaturesHook.sourceFindingError}
          findJewishSources={aiFeaturesHook.findJewishSources}
          saveSourceFindingResults={aiFeaturesHook.saveSourceFindingResults}
          discardSourceFindingResults={aiFeaturesHook.discardSourceFindingResults}

          searchResults={searchHook.searchResults}
          handleFileSelect={tabsHook.handleFileSelect}
          searchTerm={searchHook.searchTerm}
          searchError={searchHook.searchError}
          isLoadingSearch={searchHook.isSearching}
          currentSearchScope={searchHook.currentSearchScope}
          clearSearchScope={clearSearchScopeAndRelatedState}
          handleSearch={searchHook.handleSearch}

          searchOptions={searchHook.searchOptions}
          handleSearchOptionChange={searchHook.handleSearchOptionChange}
          includePatternsInput={searchHook.includePatternsInput}
          handleIncludePatternsChange={searchHook.handleIncludePatternsChange}
          excludePatternsInput={searchHook.excludePatternsInput}
          handleExcludePatternsChange={searchHook.handleExcludePatternsChange}

          recentFiles={statsHook.recentFiles}
          frequentFiles={statsHook.frequentFiles}
          isLoadingStats={statsHook.isLoadingStats}
          statsError={statsHook.statsError}
          fetchStatsFiles={statsHook.fetchStatsFiles}

          repetitionsHook={repetitionsHook}
          onCloseRepetitionView={() => handleToggleMainView('editor')}

          questionnaireHook={questionnaireHook}
          learningGraphHook={learningGraphHook} // Pass learning graph hook

          workspaceFolders={workspaceHook.workspaceFolders}
          globalLoadingMessage={globalLoadingMessage}
          isContentAreaDisabled={isAnyModalOpen}
        />
      </div>
      {questionnaireHook.isModalOpen && (
        <QuestionnaireModal
          isOpen={questionnaireHook.isModalOpen}
          onClose={questionnaireHook.closeQuestionnaireModal}
          onSubmit={questionnaireHook.submitQuestionnaire}
          questionnaireData={questionnaireHook.questionnaireData}
          isLoading={questionnaireHook.isLoadingQuestionnaire}
          error={questionnaireHook.questionnaireError}
          isSubmittedForSelectedDate={questionnaireHook.isSubmittedForSelectedDate}
          selectedDate={questionnaireHook.selectedDateForQuestionnaire}
          onDateChange={questionnaireHook.setSelectedDateForQuestionnaire} // Pass the setter from hook
          getFormattedDate={questionnaireHook.getFormattedDate} // Pass helper
          onResetAllDataSuccess={resetFrontendStateForUserDataDelete} // Pass the reset function
        />
      )}
      {questionnaireHook.showNotificationSettings && (
        <NotificationSettings
            currentSettings={questionnaireHook.notificationSettings}
            onUpdateSettings={questionnaireHook.updateNotificationSettings}
            onClose={() => questionnaireHook.setShowNotificationSettings(false)}
            isLoading={questionnaireHook.isLoadingSettings}
        />
      )}
      {isTranscriptionModalOpen && (
        <TranscriptionInputModal
            isOpen={isTranscriptionModalOpen}
            onClose={handleCloseTranscriptionModal}
            onSubmitTranscription={handleSubmitTranscriptionToAi}
            isLoading={aiFeaturesHook.isProcessingText}
            processedText={aiFeaturesHook.processedText}
            processingError={aiFeaturesHook.processingError}
            onSaveProcessedText={handleSaveProcessedTextFromModal}
            onClearProcessedText={handleClearProcessedTextForModal}
            processingMode={aiFeaturesHook.processingMode}
        />
      )}
      {isLearningGraphViewOpen && (
        <LearningGraphView
          graphData={learningGraphHook.graphData}
          isLoading={learningGraphHook.isLoadingGraph}
          error={learningGraphHook.graphError}
          currentRange={learningGraphHook.currentRange}
          onFetchData={learningGraphHook.fetchLearningGraphData}
          onClose={handleCloseLearningGraph}
        />
      )}
      {isJudaismChatModalOpen && (
        <JudaismChatModal
          isOpen={isJudaismChatModalOpen}
          onClose={handleCloseJudaismChatModal}
          useJudaismChatHook={judaismChatHook}
        />
      )}
      {/* Render API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={handleCloseApiKeyModal}
      />
      {/* Render AI Model Modal */}
      <AiModelModal
        isOpen={isAiModelModalOpen}
        onClose={handleCloseAiModelModal}
        models={aiModels}
        selectedModel={selectedAiModel}
        onSelectModel={handleSelectAiModel}
        onAddCustomModel={handleAddCustomModel}
      />
      {/* Render Pilpulta Display Window */}
      {isPilpultaVisible && (
        <PilpultaDisplay
          questions={pilpultaData}
          onClose={hidePilpulta}
        />
      )}
      {/* Render Smart Search Modal */}
      <SmartSearchModal
        isOpen={aiFeaturesHook.isSmartSearchModalOpen}
        onClose={aiFeaturesHook.closeSmartSearchModal}
        onPerformSearch={aiFeaturesHook.performSmartSearch}
        isLoading={aiFeaturesHook.isLoadingSmartSearch}
        searchResults={aiFeaturesHook.smartSearchResults}
        searchError={aiFeaturesHook.smartSearchError}
      />
      
      {/* Render Help Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={handleCloseHelpModal}
      />
      
      {/* Render Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={tabsHook.unsavedChangesModal.isOpen}
        fileName={tabsHook.unsavedChangesModal.tabToClose?.name || ''}
        onSave={tabsHook.handleModalSave}
        onDiscard={tabsHook.handleModalDiscard}
        onCancel={tabsHook.handleModalCancel}
        isSaving={tabsHook.unsavedChangesModal.isSaving}
      />
    </div>
  );
}

export default App;

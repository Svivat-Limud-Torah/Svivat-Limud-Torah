// frontend/src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { initializeBackupSystem } from './utils/aiOrganizeBackup';
import ContextMenu from './components/ContextMenu';
import SettingsModal from './components/SettingsModal';
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
import './components/OnboardingTutorial.css'; // Import Onboarding Tutorial CSS
import './components/PilpultaDisplay.css'; // Import Pilpulta CSS
import './components/UnsavedChangesModal.css'; // Import UnsavedChangesModal CSS
import './components/NewFileModal.css'; // Import NewFileModal CSS
import './components/QuotaLimitModal.css'; // Import QuotaLimitModal CSS
import './components/ModelOverloadedModal.css'; // Import ModelOverloadedModal CSS

import Sidebar from './components/Sidebar';
import MainContentArea from './components/MainContentArea';
import OnboardingTutorial from './components/OnboardingTutorial';
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
import FileConversionModal from './components/FileConversionModal'; // Import FileConversionModal
import SingleFileConversionModal from './components/SingleFileConversionModal'; // Import SingleFileConversionModal
import NewFileModal from './components/NewFileModal'; // Import NewFileModal
import ConfirmDeleteModal from './components/ConfirmDeleteModal'; // Import ConfirmDeleteModal
import CreateFolderModal from './components/CreateFolderModal'; // Import CreateFolderModal
import QuotaLimitModal from './components/QuotaLimitModal'; // Import QuotaLimitModal
import ModelOverloadedModal from './components/ModelOverloadedModal'; // Import ModelOverloadedModal


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
import { useThemeSettings } from './hooks/useThemeSettings'; // Import useThemeSettings
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
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true);
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // State for Settings modal
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false); // State for New File modal
  const [selectedFolderForNewFile, setSelectedFolderForNewFile] = useState(null); // State for context menu new file
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false); // State for Save As modal
  const [saveAsData, setSaveAsData] = useState(null); // Data for Save As modal
  const [isPilpultaVisible, setIsPilpultaVisible] = useState(false); // State for Pilpulta window
  const [pilpultaData, setPilpultaData] = useState([]); // Data for Pilpulta window
  const [isFileConversionModalOpen, setIsFileConversionModalOpen] = useState(false); // State for File Conversion modal
  const [isSingleFileConversionModalOpen, setIsSingleFileConversionModalOpen] = useState(false); // State for Single File Conversion modal
  const [singleFileConversionData, setSingleFileConversionData] = useState(null); // Data for Single File Conversion modal
  
  // New states for delete confirmation and folder creation
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [baseFolderForDelete, setBaseFolderForDelete] = useState(null);
  
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createFolderData, setCreateFolderData] = useState(null);
  
  // Quota Limit Modal state
  const [isQuotaLimitModalOpen, setIsQuotaLimitModalOpen] = useState(false);
  const [isModelOverloadedModalOpen, setIsModelOverloadedModalOpen] = useState(false);
  
  // Smart Search modal state is managed within useAiFeatures hook
  const [editorFontSize, setEditorFontSize] = useState(DEFAULT_FONT_SIZE_PX);
  const [presentationFontSize, setPresentationFontSize] = useState(DEFAULT_FONT_SIZE_PX);
  
  // Font management state
  const [appFont, setAppFont] = useState('Arial');
  const [editorFont, setEditorFont] = useState('Arial');


  // --- Initialize Hooks ---
  const workspaceHook = useWorkspace(setGlobalLoadingMessage);
  const statsHook = useStats({ workspaceFolders: workspaceHook.workspaceFolders });
  const repetitionsHook = useRepetitions(setGlobalLoadingMessage);
  const questionnaireHook = useQuestionnaire(setGlobalLoadingMessage); // Pass setGlobalLoadingMessage
  const learningGraphHook = useLearningGraph(); // Initialize Learning Graph Hook
  const judaismChatHook = useJudaismChat({ setGlobalLoadingMessage, selectedAiModel }); // Pass selected model

  // Check if user should see file conversion prompt
  useEffect(() => {
    // Initialize AI organization backup system
    initializeBackupSystem();
    
    const hasSeenConversionPrompt = localStorage.getItem('hasSeenFileConversionPrompt');
    const shouldShowPrompt = localStorage.getItem('showFileConversionPrompt');
    const hasCompletedConversion = localStorage.getItem('hasCompletedFileConversion') === 'true';
    
    // Show prompt on first app load unless user specifically disabled it or already completed conversion
    if ((!hasSeenConversionPrompt || shouldShowPrompt === 'true') && !hasCompletedConversion) {
      // Small delay to let the app initialize
      const timer = setTimeout(() => {
        setIsFileConversionModalOpen(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEditorFontSizeChange = (newSize) => {
    setEditorFontSize(newSize);
    // Persist to localStorage if desired
    localStorage.setItem('editorFontSize', newSize);
  };

  const handlePresentationFontSizeChange = (newSize) => {
    setPresentationFontSize(newSize);
    // Persist to localStorage if desired
    localStorage.setItem('presentationFontSize', newSize);
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

    const savedPresentationFontSize = localStorage.getItem('presentationFontSize');
    if (savedPresentationFontSize) {
      setPresentationFontSize(parseInt(savedPresentationFontSize, 10));
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
    localStorage.removeItem('editorFontSize'); // Clear editor font size
    localStorage.removeItem('presentationFontSize'); // Clear presentation font size
    localStorage.removeItem('appFont'); // Clear app font
    localStorage.removeItem('editorFont'); // Clear editor font
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

  // --- Quota Limit Modal Management ---
  const showQuotaLimitModal = useCallback(() => {
    setIsQuotaLimitModalOpen(true);
  }, []);

  const hideQuotaLimitModal = useCallback(() => {
    setIsQuotaLimitModalOpen(false);
  }, []);

  // --- Model Overloaded Modal Management ---
  const showModelOverloadedModal = useCallback(() => {
    setIsModelOverloadedModalOpen(true);
  }, []);

  const hideModelOverloadedModal = useCallback(() => {
    setIsModelOverloadedModalOpen(false);
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

  // Initialize theme settings hook
  const themeHook = useThemeSettings();

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
    setIsSaveAsModalOpen,
    setSaveAsData,
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
    showQuotaLimitModal, // Pass the function to show the quota limit modal
    showModelOverloadedModal, // Pass the function to show the model overloaded modal
  });

  // --- Effects & Callbacks ---
  useEffect(() => {
    fetch(`${API_BASE_URL}/hello`)
      .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
      .then(data => setBackendMessage(data.message))
      .catch(err => console.warn("לא ניתן להתחבר לשרת לקבלת הודעת 'hello':", err.message));
  }, []);

  // Auto-open file conversion modal when no workspace is present
  useEffect(() => {
    console.log('FileConversion Effect Running:', {
      initialFoldersLoaded: workspaceHook.initialFoldersLoaded,
      workspaceFoldersCount: workspaceHook.workspaceFolders.length,
      isModalOpen: isFileConversionModalOpen
    });
    
    // Only check after initial workspace folders have been loaded
    if (!workspaceHook.initialFoldersLoaded) {
      console.log('Initial folders not yet loaded, waiting...');
      return;
    }
    
    const neverShowAgain = localStorage.getItem('fileConversionNeverShow') === 'true';
    const postponedTimestamp = localStorage.getItem('fileConversionPostponedTime');
    
    // Check if 5 hours (5 * 60 * 60 * 1000 = 18000000 ms) have passed since postponement
    const fiveHoursInMs = 5 * 60 * 60 * 1000;
    const now = Date.now();
    let shouldRespectPostponement = false;
    
    if (postponedTimestamp) {
      const timeSincePostponed = now - parseInt(postponedTimestamp);
      shouldRespectPostponement = timeSincePostponed < fiveHoursInMs;
      
      if (!shouldRespectPostponement) {
        console.log('5 hours have passed since postponement - clearing postponed flag');
        localStorage.removeItem('fileConversionPostponedTime');
      } else {
        const remainingTime = fiveHoursInMs - timeSincePostponed;
        const remainingHours = Math.floor(remainingTime / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        console.log(`File conversion still postponed for ${remainingHours}h ${remainingMinutes}m`);
      }
    }
    
    console.log('Checking workspace status for file conversion modal:', {
      workspaceFoldersCount: workspaceHook.workspaceFolders.length,
      isModalOpen: isFileConversionModalOpen,
      neverShowAgain,
      postponedTimestamp,
      shouldRespectPostponement,
      initialFoldersLoaded: workspaceHook.initialFoldersLoaded
    });
    
    // If no workspace folders exist, and either no postponement or 5 hours have passed, show modal
    if (workspaceHook.workspaceFolders.length === 0 && 
        !isFileConversionModalOpen && 
        !neverShowAgain && 
        !shouldRespectPostponement) {
      // Delay the modal opening to ensure the component is fully mounted
      const timer = setTimeout(() => {
        console.log('Opening file conversion modal - no workspace detected and postponement expired/cleared');
        setIsFileConversionModalOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      console.log('Not opening file conversion modal because:', {
        hasWorkspace: workspaceHook.workspaceFolders.length > 0,
        modalAlreadyOpen: isFileConversionModalOpen,
        neverShowAgain,
        shouldRespectPostponement
      });
    }
  }, [workspaceHook.workspaceFolders.length, isFileConversionModalOpen, workspaceHook.initialFoldersLoaded]);

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
  const toggleFormattingToolbar = () => setShowFormattingToolbar(prev => !prev);

  const handleToggleMainView = useCallback((viewType) => {
    // Added 'learningGraph' and 'search' to the list of views that don't toggle back to editor on second click
    if (mainViewMode === viewType && !['flashcards', 'summary', 'sourceResults', 'repetitions', 'weeklySummary', 'learningGraph', 'search'].includes(viewType)) {
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
        action: () => {
          // Calculate the target path
          const targetPath = path.join(baseFolder.path, item.path);
          
          // Open the new file modal with the selected folder as default location
          setIsNewFileModalOpen(true);
          // We'll need to pass the target path to the modal somehow
          // For now, we'll store it in a state variable
          setSelectedFolderForNewFile({ 
            path: targetPath, 
            workspaceFolder: baseFolder 
          });
        }
      });
      menuItems.push({
        label: HEBREW_TEXT.newFolder + "...",
        action: () => {
          // Open the create folder modal
          setCreateFolderData({
            parentItem: item,
            baseFolder: baseFolder,
            parentFolderName: item ? item.name : baseFolder.name
          });
          setIsCreateFolderModalOpen(true);
        }
      });
    }
    menuItems.push({ type: 'separator' });
    
    // Add conversion option for files only
    if (!item.isFolder) {
      menuItems.push({
        label: "המר ל... 🔄",
        action: () => {
          // Calculate the full file path
          const fullFilePath = path.join(baseFolder.path, item.path);
          
          // Open the single file conversion modal
          setSingleFileConversionData({
            filePath: fullFilePath,
            fileName: item.name,
            baseFolder: baseFolder
          });
          setIsSingleFileConversionModalOpen(true);
        }
      });
      menuItems.push({ type: 'separator' });
    }
    
    menuItems.push({
      label: HEBREW_TEXT.deleteItem,
      action: () => {
        // Open the delete confirmation modal
        setItemToDelete(item);
        setBaseFolderForDelete(baseFolder);
        setIsConfirmDeleteModalOpen(true);
      }
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
    if (workspaceHook.workspaceFolders.length === 0) { 
      alert(HEBREW_TEXT.addFolderFirst); 
      return; 
    }
    
    // Open the new file modal instead of using prompts
    setIsNewFileModalOpen(true);
  }, [workspaceHook.workspaceFolders]);

  // Handle file creation from the new file modal
  const handleCreateFileFromModal = useCallback(async (selectedPath, fileName) => {
    try {
      // Check if the selected path is within an existing workspace folder
      let targetWorkspaceFolder = null;
      let relativePath = fileName;

      for (const folder of workspaceHook.workspaceFolders) {
        if (selectedPath.startsWith(folder.path)) {
          targetWorkspaceFolder = folder;
          // Calculate relative path from workspace folder
          relativePath = selectedPath === folder.path 
            ? fileName 
            : `${selectedPath.slice(folder.path.length + 1)}\\${fileName}`;
          break;
        }
      }

      if (targetWorkspaceFolder) {
        // Use existing workspace folder
        await fileOperationsHook.handleCreateNewFileOrSummary(
          targetWorkspaceFolder.path, 
          relativePath.replace(/\\/g, '/'), // Convert to forward slashes for consistency
          '', 
          true
        );
      } else {
        // The selected path is outside existing workspace folders
        // Add it as a new workspace folder first
        await workspaceHook.addWorkspaceFolder(selectedPath);
        
        // Then create the file in the root of the new workspace
        await fileOperationsHook.handleCreateNewFileOrSummary(
          selectedPath, 
          fileName, 
          '', 
          true
        );
      }
    } catch (error) {
      console.error('Error creating file:', error);
      alert(`שגיאה ביצירת הקובץ: ${error.message}`);
    }
  }, [fileOperationsHook.handleCreateNewFileOrSummary, workspaceHook.workspaceFolders, workspaceHook.addWorkspaceFolder]);

  // Handle saving file from the modal (for Save As functionality)
  const handleSaveFileFromModal = useCallback(async (selectedPath, fileName) => {
    if (!saveAsData) return;
    
    try {
      // Check if the selected path is within an existing workspace folder
      let targetWorkspaceFolder = null;
      let relativePath = fileName;

      for (const folder of workspaceHook.workspaceFolders) {
        if (selectedPath.startsWith(folder.path)) {
          targetWorkspaceFolder = folder;
          // Calculate relative path from workspace folder
          relativePath = selectedPath === folder.path 
            ? fileName 
            : `${selectedPath.slice(folder.path.length + 1)}\\${fileName}`;
          break;
        }
      }

      if (targetWorkspaceFolder) {
        // Use the fileOperations hook to save with the new path
        await fileOperationsHook.saveFileToPath(
          saveAsData.tabId, 
          targetWorkspaceFolder.path, 
          relativePath.replace(/\\/g, '/'), // Convert to forward slashes for consistency
          saveAsData.content
        );
      } else {
        // The selected path is outside existing workspace folders
        // Add it as a new workspace folder first
        await workspaceHook.addWorkspaceFolder(selectedPath);
        
        // Then save the file in the root of the new workspace
        await fileOperationsHook.saveFileToPath(
          saveAsData.tabId, 
          selectedPath, 
          fileName, 
          saveAsData.content
        );
      }
      
      // Clear the save data and close modal
      setSaveAsData(null);
      setIsSaveAsModalOpen(false);
    } catch (error) {
      console.error('Error saving file:', error);
      alert(`שגיאה בשמירת הקובץ: ${error.message}`);
    }
  }, [saveAsData, fileOperationsHook, workspaceHook.workspaceFolders, workspaceHook.addWorkspaceFolder]);

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
    // Use the modal instead of direct deletion
    setItemToDelete(itemToDelete);
    setBaseFolderForDelete(baseFolder);
    setIsConfirmDeleteModalOpen(true);
  }, [activeTabObject, mainViewMode, workspaceHook.workspaceFolders]);

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

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (itemToDelete && baseFolderForDelete) {
      await fileOperationsHook.deleteItemFromExplorer(itemToDelete, baseFolderForDelete);
      setItemToDelete(null);
      setBaseFolderForDelete(null);
    }
  }, [itemToDelete, baseFolderForDelete, fileOperationsHook]);

  // Handle folder creation
  const handleCreateFolder = useCallback(async (folderName) => {
    if (createFolderData) {
      await fileOperationsHook.createNewFolderFromExplorer(
        folderName,
        createFolderData.parentItem,
        createFolderData.baseFolder
      );
      setCreateFolderData(null);
    }
  }, [createFolderData, fileOperationsHook]);

  // Handle folder creation from sidebar (for context menu on workspace folders)
  const handleCreateFolderFromSidebar = useCallback((parentItem, baseFolder) => {
    setCreateFolderData({
      parentItem: parentItem,
      baseFolder: baseFolder,
      parentFolderName: parentItem ? parentItem.name : baseFolder.name
    });
    setIsCreateFolderModalOpen(true);
  }, []);

  // Handle delete from sidebar  
  const handleDeleteFromSidebar = useCallback((item, baseFolder) => {
    setItemToDelete(item);
    setBaseFolderForDelete(baseFolder);
    setIsConfirmDeleteModalOpen(true);
  }, []);

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

      // Handle Undo: Ctrl+Z (English) or Ctrl+ז (Hebrew)
      if (isCtrlOrMeta && !event.shiftKey && (event.key.toLowerCase() === 'z' || event.key === 'ז')) {
        // Only handle if we're in editor mode and have an active editor
        if (mainViewMode === 'editor' && editorSharedRef.current) {
          event.preventDefault();
          try {
            const view = editorSharedRef.current.getEditorView?.();
            if (view && view.state) {
              const { undo } = require('@codemirror/commands');
              undo(view);
              view.focus();
            }
          } catch (error) {
            console.error('שגיאה בביצוע undo:', error);
          }
        }
        return;
      }

      // Handle Redo: Ctrl+Y (English) or Ctrl+ט (Hebrew) or Ctrl+Shift+Z
      if (isCtrlOrMeta && ((event.key.toLowerCase() === 'y' || event.key === 'ט') || 
                           (event.shiftKey && (event.key.toLowerCase() === 'z' || event.key === 'ז')))) {
        // Only handle if we're in editor mode and have an active editor
        if (mainViewMode === 'editor' && editorSharedRef.current) {
          event.preventDefault();
          try {
            const view = editorSharedRef.current.getEditorView?.();
            if (view && view.state) {
              const { redo } = require('@codemirror/commands');
              redo(view);
              view.focus();
            }
          } catch (error) {
            console.error('שגיאה בביצוע redo:', error);
          }
        }
        return;
      }

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
      // Toggle formatting toolbar with Shift+Q (English) or Shift+/ 
      if (event.shiftKey && !event.ctrlKey && !event.metaKey && (event.key.toLowerCase() === 'q' || event.key === '/')) {
        event.preventDefault();
        toggleFormattingToolbar();
      }
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'f' || event.key === 'כ')) {
        event.preventDefault();
        
        // If there's an active file in the editor, focus on the CodeMirror search
        if (appLevelActiveTabPath && mainViewMode === 'editor' && editorSharedRef.current) {
          // Try to open the in-file search panel
          const searchOpened = editorSharedRef.current.openSearch();
          if (!searchOpened) {
            // Fallback to global search if the editor search failed
            if (mainViewMode !== 'search') handleToggleMainView('search');
            else setTimeout(() => searchHook.searchInputRef.current?.focus(), 0);
          }
        } else {
          // Fallback to global search if no active editor
          if (mainViewMode !== 'search') handleToggleMainView('search');
          else setTimeout(() => searchHook.searchInputRef.current?.focus(), 0);
        }
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
        else if (isQuotaLimitModalOpen) hideQuotaLimitModal();
        else if (isModelOverloadedModalOpen) hideModelOverloadedModal();
        else if (isJudaismChatModalOpen) setIsJudaismChatModalOpen(false);
        else if (isAiModelModalOpen) setIsAiModelModalOpen(false);
        else if (isApiKeyModalOpen) setIsApiKeyModalOpen(false);
        else if (isHelpModalOpen) setIsHelpModalOpen(false);
        else if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        else if (isFileConversionModalOpen) setIsFileConversionModalOpen(false);
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
      appLevelActiveTabPath, mainViewMode, fileOperationsHook.handleSaveFile, toggleZenMode, toggleFormattingToolbar,
      searchHook.searchInputRef, contextMenuState.visible, handleCloseContextMenu,
      handleToggleMainView, isTranscriptionModalOpen,
      questionnaireHook.isModalOpen, questionnaireHook.closeQuestionnaireModal,
      questionnaireHook.showNotificationSettings, questionnaireHook.setShowNotificationSettings,
      isLearningGraphViewOpen, setIsLearningGraphViewOpen,
      isJudaismChatModalOpen, setIsJudaismChatModalOpen,
      isAiModelModalOpen, setIsAiModelModalOpen,
      isApiKeyModalOpen, setIsApiKeyModalOpen,
      isHelpModalOpen, setIsHelpModalOpen,
      isFileConversionModalOpen, setIsFileConversionModalOpen,
      isPilpultaVisible, hidePilpulta, // Added Pilpulta escape handling
      isQuotaLimitModalOpen, hideQuotaLimitModal, // Added quota limit modal escape handling
      isModelOverloadedModalOpen, hideModelOverloadedModal, // Added model overloaded modal escape handling
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

  // --- File Conversion Modal Handlers ---
  const handleOpenFileConversionModal = () => {
    setIsFileConversionModalOpen(true);
  };

  const handleCloseFileConversionModal = (option = 'postpone') => {
    setIsFileConversionModalOpen(false);
    
    if (option === 'never') {
      // User clicked "Don't show again"
      localStorage.setItem('fileConversionNeverShow', 'true');
      localStorage.removeItem('fileConversionPostponedTime');
      console.log('File conversion modal set to never show again');
    } else if (option === 'postpone') {
      // User clicked "I'll do it later" or closed the modal - store timestamp for 5-hour reminder
      const currentTime = Date.now();
      localStorage.setItem('fileConversionPostponedTime', currentTime.toString());
      localStorage.removeItem('fileConversionNeverShow');
      console.log('File conversion modal postponed for 5 hours, timestamp:', currentTime);
    } else if (option === 'success') {
      // User completed conversion successfully - clear all restrictions
      localStorage.removeItem('fileConversionNeverShow');
      localStorage.removeItem('fileConversionPostponedTime');
      console.log('File conversion completed successfully - cleared all restrictions');
    }
  };

  const handleOpenFileConversionFromSettings = () => {
    // This is called from settings menu, so we reset the "don't show again" and "postponed" states
    localStorage.removeItem('fileConversionNeverShow');
    localStorage.removeItem('fileConversionPostponedTime');
    setIsFileConversionModalOpen(true);
  };

  // --- Single File Conversion Modal Handlers ---
  const handleCloseSingleFileConversionModal = () => {
    setIsSingleFileConversionModalOpen(false);
    setSingleFileConversionData(null);
  };

  const handleSingleFileConversionSuccess = (result) => {
    console.log('File conversion successful:', result);
    
    // Refresh the workspace structure to show the new file
    if (singleFileConversionData && singleFileConversionData.baseFolder) {
      workspaceHook.refreshWorkspaceFolder(singleFileConversionData.baseFolder.path);
    }
    
    // Close the modal
    handleCloseSingleFileConversionModal();
  };

  // Debug function to clear localStorage and force file conversion modal
  const forceOpenFileConversionModal = () => {
    console.log('Force opening file conversion modal (debug)');
    localStorage.removeItem('fileConversionNeverShow');
    localStorage.removeItem('fileConversionPostponedTime');
    setIsFileConversionModalOpen(true);
  };

  // Add keyboard shortcut for debugging (Ctrl+Shift+F)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        forceOpenFileConversionModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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


  const isAnyModalOpen = isTranscriptionModalOpen || questionnaireHook.isModalOpen || questionnaireHook.showNotificationSettings || isLearningGraphViewOpen || isJudaismChatModalOpen || isApiKeyModalOpen || isAiModelModalOpen || isHelpModalOpen || isSettingsModalOpen || isPilpultaVisible || aiFeaturesHook.isSmartSearchModalOpen || tabsHook.unsavedChangesModal.isOpen || isFileConversionModalOpen || isNewFileModalOpen || isSaveAsModalOpen || isConfirmDeleteModalOpen || isCreateFolderModalOpen || isQuotaLimitModalOpen || isModelOverloadedModalOpen; // Added quota limit and model overloaded modals
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
          {!isZenMode && <h1 style={{ margin: 0, /* fontSize removed */ color: `var(--theme-text-primary)`, whiteSpace: 'nowrap' }}>{HEBREW_TEXT.appName}</h1>}
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
                data-tutorial="api-key-button"
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
              
              {/* File Conversion Button - moved before settings */}
              <button
                className="btn"
                onClick={handleOpenFileConversionFromSettings}
                disabled={isGlobalActionDisabled}
                title="המרת קבצים לפורמט Markdown"
              >
                המרת קבצים
              </button>
              
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                disabled={isGlobalActionDisabled}
                title="הגדרות התוכנה"
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
          {!isZenMode && (
            <>
              {/* Removed conditional btn-primary/btn-subtle, always use btn */}
              <button className={`btn`} onClick={editorSettingsHook.toggleShowLineNumbers} disabled={isAnyModalOpen} title={HEBREW_TEXT.toggleLineNumbers(editorSettingsHook.showLineNumbers)}>{editorSettingsHook.showLineNumbers ? 'מספרים ✓' : 'מספרים ✕'}</button>
              {/* Keep Zen mode toggle as is for now, unless user wants it changed too */}
              <button className={`btn ${isZenMode ? 'btn-primary' : 'btn-subtle'}`} onClick={toggleZenMode} disabled={isAnyModalOpen} title={HEBREW_TEXT.zenMode(isZenMode)}>{isZenMode ? 'Zen ✓' : 'Zen ✕'}</button>
            </>
          )}
          {/* Show only zen button when in zen mode - but only if not in editor with markdown file */}
          {isZenMode && !(mainViewMode === 'editor' && activeTabObject && activeTabObject.id?.toLowerCase().endsWith('.md')) && (
            <button className={`btn btn-primary`} onClick={toggleZenMode} disabled={isAnyModalOpen} title={HEBREW_TEXT.zenMode(isZenMode)}>Zen ✓</button>
          )}
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
            onGenerateFlashcards={aiFeaturesHook.generateFlashcards} // Pass Flashcards handler
            isGeneratingFlashcards={aiFeaturesHook.isLoadingFlashcards} // Pass flashcards loading state
            editorFontSize={editorFontSize} // Pass down font size
            onEditorFontSizeChange={handleEditorFontSizeChange} // Pass down handler
            presentationFontSize={presentationFontSize} // Pass down presentation font size
            onPresentationFontSizeChange={handlePresentationFontSizeChange} // Pass down presentation handler
            appFont={appFont} // Pass app font
            editorFont={editorFont} // Pass editor font
            onAppFontChange={handleAppFontChange} // Pass app font change handler
            onEditorFontChange={handleEditorFontChange} // Pass editor font change handler
            handleToggleMainView={handleToggleMainView} // Pass function to toggle main view
            mainViewMode={mainViewMode} // Pass current main view mode
            activeTabObject={activeTabObject} // Pass active tab object to check file type
            repetitionsHook={repetitionsHook} // Pass repetitions hook for notifications
            editorRef={editorSharedRef} // Pass editor reference for undo functionality
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
            createNewFolderFromExplorer={handleCreateFolderFromSidebar}
            deleteItemFromExplorer={handleDeleteFromSidebar}
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
          presentationFontSize={presentationFontSize} // Pass presentationFontSize to MainContentArea
          selectedAiModel={selectedAiModel} // Pass selectedAiModel to MainContentArea
          isZenMode={isZenMode} // Pass zen mode state
          showFormattingToolbar={showFormattingToolbar} // Pass formatting toolbar state
          toggleZenMode={toggleZenMode} // Pass zen mode toggle function
          toggleFormattingToolbar={toggleFormattingToolbar} // Pass formatting toolbar toggle function
          toggleShowLineNumbers={editorSettingsHook.toggleShowLineNumbers} // Pass line numbers toggle function
          showLineNumbers={editorSettingsHook.showLineNumbers} // Pass line numbers state
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

          generatePilpultaFromSelectedText={aiFeaturesHook.generatePilpultaFromSelectedText}
          findJewishSourcesFromSelectedText={aiFeaturesHook.findJewishSourcesFromSelectedText}
          generateFlashcardsFromSelectedText={aiFeaturesHook.generateFlashcardsFromSelectedText}
          generateSummaryFromSelectedText={aiFeaturesHook.generateSummaryFromSelectedText}
          organizeSelectedText={aiFeaturesHook.organizeSelectedText}

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
      
      {/* Render Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        notificationSettings={questionnaireHook.notificationSettings}
        onUpdateNotificationSettings={questionnaireHook.updateNotificationSettings}
        isNotificationLoading={questionnaireHook.isLoadingNotificationSettings}
        currentTheme={themeHook.currentTheme}
        onUpdateTheme={themeHook.updateTheme}
        onOpenFileConversion={handleOpenFileConversionFromSettings}
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
      
      {/* Render File Conversion Modal */}
      <FileConversionModal
        isOpen={isFileConversionModalOpen}
        onClose={handleCloseFileConversionModal}
        addWorkspaceFolder={workspaceHook.addWorkspaceFolder}
      />
      
      {/* Render Single File Conversion Modal */}
      <SingleFileConversionModal
        isOpen={isSingleFileConversionModalOpen}
        onClose={handleCloseSingleFileConversionModal}
        filePath={singleFileConversionData?.filePath || ''}
        fileName={singleFileConversionData?.fileName || ''}
        onSuccess={handleSingleFileConversionSuccess}
      />
      
      {/* Render New File Modal */}
      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={() => {
          setIsNewFileModalOpen(false);
          setSelectedFolderForNewFile(null);
        }}
        onCreateFile={handleCreateFileFromModal}
        workspaceFolders={workspaceHook.workspaceFolders}
        defaultLocation={activeTabObject ? workspaceHook.workspaceFolders.find(wf => wf.path === activeTabObject.basePath) : null}
        preselectedPath={selectedFolderForNewFile?.path || null}
      />
      
      {/* Render Save As Modal */}
      <NewFileModal
        isOpen={isSaveAsModalOpen}
        onClose={() => {
          setIsSaveAsModalOpen(false);
          setSaveAsData(null);
        }}
        onCreateFile={handleSaveFileFromModal}
        workspaceFolders={workspaceHook.workspaceFolders}
        defaultLocation={saveAsData?.workspaceFolder || null}
        mode="save"
        initialFileName={saveAsData?.fileName || ''}
        initialExtension={saveAsData?.extension || 'md'}
      />
      
      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => {
          setIsConfirmDeleteModalOpen(false);
          setItemToDelete(null);
          setBaseFolderForDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.name || ''}
        itemType={itemToDelete?.isFolder ? 'folder' : 'file'}
      />
      
      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => {
          setIsCreateFolderModalOpen(false);
          setCreateFolderData(null);
        }}
        onCreateFolder={handleCreateFolder}
        parentFolderName={createFolderData?.parentFolderName || ''}
      />
      
      {/* Quota Limit Modal */}
      <QuotaLimitModal
        isOpen={isQuotaLimitModalOpen}
        onClose={hideQuotaLimitModal}
      />
      
      {/* Model Overloaded Modal */}
      <ModelOverloadedModal
        isOpen={isModelOverloadedModalOpen}
        onClose={hideModelOverloadedModal}
      />
      
      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        isWorkspaceSetup={workspaceHook.workspaceFolders.length > 0}
        onOpenApiKeyModal={handleOpenApiKeyModal}
        onClose={() => {}}
      />
    </div>
  );
}

export default App;

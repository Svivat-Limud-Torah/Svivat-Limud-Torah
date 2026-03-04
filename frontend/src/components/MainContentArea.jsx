// frontend/src/components/MainContentArea.jsx
import React, { useState, useRef, useCallback } from 'react';
import Editor from './Editor';
import MarkdownToolbar from './MarkdownToolbar';
import MarkdownPreview from './MarkdownPreview';
import StatusBar from './StatusBar';
// EditorToolbar is now part of App.jsx structure, not directly in MainContentArea if mainViewMode !== 'editor'
// import EditorToolbar from './EditorToolbar'; 
import FlashcardView from './FlashcardView';
import SummaryView from './SummaryView';
import SourceResultsDisplay from './SourceResultsDisplay';
import RepetitionListView from './RepetitionListView';
import WeeklySummaryDisplay from './WeeklySummaryDisplay'; // Import WeeklySummaryDisplay
import TextOrganizationProgressModal from './TextOrganizationProgressModal'; // Import progress modal
import SearchView from './SearchView';
import UserSnapshotView from './UserSnapshotView'; // Import UserSnapshotView
// DailyAnswersDisplay would be a new component if we need a dedicated view for it.
// For now, detailed answers might be shown within WeeklySummaryDisplay or managed by the hook.
import { getApiKeyDetails } from './ApiKeyModal'; // Import the helper function
import { useTextOrganizationWithProgress } from '../hooks/useTextOrganizationWithProgress'; // Import the progress hook
import AnnotationsPanel from './AnnotationsPanel';
import DrawingCanvas from './DrawingCanvas';
import BookmarkPanel from './BookmarkPanel';
import { EditorView } from '@codemirror/view';

import path from '../utils/pathUtils';
import { APP_DIRECTION, SUPPORTED_IMAGE_EXTENSIONS_CLIENT, HEBREW_TEXT } from '../utils/constants';
import { storeFullFileBackup, getBackupForFile } from '../utils/aiOrganizeBackup';
import './VersionToggleBanner.css';


const MainContentArea = ({
  mainViewMode,
  openTabs,
  activeTabPath,
  activeTabObject,
  handleTabClick,
  handleCloseTab,
  savingTabPath,
  editorSharedRef,
  isLoadingFileContent,
  fileError,
  handleEditorChange,
  searchTermToHighlightInEditor,
  scrollToLine,
  showLineNumbers,
  highlightActiveLine,
  // Scroll position props
  initialScrollPosition,
  onScrollPositionChange,
  // AI Feature Props (Flashcards, Summary, Sources)
  flashcardData,
  isLoadingFlashcards,
  flashcardError,
  setMainViewMode, // Keep for internal view changes if any, or for closing AI views
  generateFlashcards,
  summaryText,
  isLoadingSummary: isLoadingAiSummary, // Renamed to avoid conflict with questionnaire summary loading
  summaryError: aiSummaryError,
  saveSummary,
  discardSummary,
  generateSummary,
  sourceFindingResults,
  isLoadingSourceFinding,
  sourceFindingError,
  findJewishSources,
  saveSourceFindingResults,
  discardSourceFindingResults,

  // Selected Text AI Features
  generatePilpultaFromSelectedText,
  findJewishSourcesFromSelectedText,
  generateFlashcardsFromSelectedText,
  generateSummaryFromSelectedText,
  organizeSelectedText,

  // Error modals
  showModelOverloadedModal,
  showQuotaLimitModal,

  // --- Search V2 Props ---
  searchResults,
  handleFileSelect,
  searchTerm,
  setSearchTerm,
  searchInputRef,
  searchError: searchViewError,
  isLoadingSearch: isSearching,
  currentSearchScope,
  clearSearchScope,
  handleSearch,
  searchOptions,
  handleSearchOptionChange,
  includePatternsInput,
  handleIncludePatternsChange,
  excludePatternsInput,
  handleExcludePatternsChange,

  // Snapshot props
  userSnapshotHook,

  // Workspace and Global
  workspaceFolders,
  globalLoadingMessage, // To disable elements if something global is happening
  isContentAreaDisabled, // New prop from App.jsx

  // Repetitions
  repetitionsHook,
  onCloseRepetitionView,

  // Questionnaire & Learning Graph
  questionnaireHook, // Contains all questionnaire states and functions
  learningGraphHook, // Contains all learning graph states and functions (though graph is a modal)
  className, // Added className prop
  editorFontSize, // Added from App.jsx
  editorFont, // Added from App.jsx
  presentationFontSize, // Added from App.jsx
  selectedAiModel, // Added selectedAiModel prop
  handleOpenNewTab, // Added for the new tab button
  showFormattingToolbar, // Added formatting toolbar state  
  toggleFormattingToolbar, // Added formatting toolbar toggle function
  toggleShowLineNumbers, // Added line numbers toggle function
  isAutoSaving, // Auto-save indicator
  isSplitMode,
  rightPaneTabPath,
  rightPaneTabObject,
  onRightPaneTabClick,
  handleRightPaneEditorChange,
  rightEditorRef,
  // Annotations
  isAnnotationMode,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onAddAnnotation,
  drawingsHook,
  // Bookmarks
  bookmarks,
  isBookmarkPanelOpen,
  onAddBookmark,
  onDeleteBookmark,
  onUpdateBookmark,
  onToggleBookmarkPin,
  onCloseBookmarkPanel,
}) => {
  // State for markdown preview mode
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [isFullPreview, setIsFullPreview] = useState(false);
  // Track if user explicitly hid the preview for the current file session
  const [userHiddenPreview, setUserHiddenPreview] = useState(false);
  const [aiOrganizeCompleted, setAiOrganizeCompleted] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  // Version toggle state for switching between original and organized text
  const [showVersionToggle, setShowVersionToggle] = useState(false);
  const [isViewingOriginal, setIsViewingOriginal] = useState(false);
  const [organizedContentBackup, setOrganizedContentBackup] = useState(null);
  const [versionToggleFileId, setVersionToggleFileId] = useState(null);
  // Cursor position for status bar
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Split pane resize
  const [splitRatio, setSplitRatio] = useState(0.5);
  const splitContainerRef = useRef(null);
  const isDraggingSplit = useRef(false);

  const handleSplitDragStart = useCallback((e) => {
    e.preventDefault();
    isDraggingSplit.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev) => {
      if (!isDraggingSplit.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      // RTL: right edge is start
      const ratio = APP_DIRECTION === 'rtl'
        ? (rect.right - ev.clientX) / rect.width
        : (ev.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.15, Math.min(0.85, ratio)));
    };

    const onMouseUp = () => {
      isDraggingSplit.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Reset preview state when switching to a different file
  React.useEffect(() => {
    setShowMarkdownPreview(false);
    setIsFullPreview(false);
    setUserHiddenPreview(false);
    setCursorPos({ line: 1, col: 1 });
  }, [activeTabObject?.id]);

  // Use the text organization progress hook
  const {
    isProcessing,
    progress,
    result,
    error,
    organizeText,
    cancelProcess,
    resetState
  } = useTextOrganizationWithProgress({ showModelOverloadedModal, showQuotaLimitModal });

  const handlePreviewToggle = (isPreview) => {
    setShowMarkdownPreview(isPreview);
    setIsFullPreview(false);
    // If user manually shows the preview, reset the hidden flag
    if (isPreview) setUserHiddenPreview(false);
  };

  // Called when user explicitly closes the preview panel
  const handleUserHidePreview = () => {
    setShowMarkdownPreview(false);
    setIsFullPreview(false);
    setUserHiddenPreview(true);
  };

  // Called for full-document preview (no editor)
  const handleFullPreview = () => {
    setIsFullPreview(true);
    setShowMarkdownPreview(false);
    setUserHiddenPreview(false);
  };

  // Called on markdown insert or AI complete — only shows if user hasn't explicitly hidden it
  const handleAutoShowPreview = () => {
    if (!userHiddenPreview) {
      setShowMarkdownPreview(true);
      setIsFullPreview(false);
    }
  };

  const handleOrganizeTextToggle = async () => {
    // Prevent multiple simultaneous calls
    if (isProcessing) {
      return;
    }

    if (!activeTabObject || !activeTabObject.id?.toLowerCase().endsWith('.md')) {
      alert('פיצ\'ר ארגון הטקסט זמין רק עבור קבצי Markdown (.md)');
      return;
    }

    // בדיקה שיש תוכן לארגון
    if (!activeTabObject.content || activeTabObject.content.trim() === '') {
      alert('הקובץ ריק - אין תוכן לארגון');
      return;
    }

    // Large text detection and user notification
    const textLines = activeTabObject.content.split('\n');
    const isLargeText = textLines.length > 80;
    const isVeryLargeText = textLines.length >= 200;

    if (isVeryLargeText) {
      const userConfirmed = confirm(HEBREW_TEXT.largeFileWarning(textLines.length));
      if (!userConfirmed) {
        return;
      }
    } else if (isLargeText) {
      const estimatedTime = textLines.length > 300 ? '2-3 דקות' : '1-2 דקות';
      const userConfirmed = confirm(`הטקסט מכיל ${textLines.length} שורות. זהו טקסט גדול שיעובד בגישה מותאמת.\n\nזמן עיבוד משוער: ${estimatedTime}\n\nהאם להמשיך?`);
      if (!userConfirmed) {
        return;
      }
    }

    // Store original content as backup for undo functionality
    storeFullFileBackup(activeTabObject.id, activeTabObject.content);

    // Get the selected AI model from props or localStorage with fallback
    const aiModel = selectedAiModel || localStorage.getItem('selectedAiModel') || 'gemini-2.5-pro';

    // null → SmartSearchService builds per-chunk prompts automatically
    const optimizedPrompt = null;

    // Show progress modal and start organization
    setShowProgressModal(true);
    await organizeText(activeTabObject.content, aiModel, optimizedPrompt);
  };

  // Handle progress modal close
  const handleProgressModalClose = () => {
    if (!isProcessing) {
      setShowProgressModal(false);
      resetState();
    }
  };

  // Handle cancel organization
  const handleCancelOrganization = async () => {
    await cancelProcess();
    setShowProgressModal(false);
  };

  // Version toggle handlers — defined before the completion useEffect that sets toggle state
  const handleDismissVersionToggle = useCallback(() => {
    setShowVersionToggle(false);
    setIsViewingOriginal(false);
    setOrganizedContentBackup(null);
    setVersionToggleFileId(null);
  }, []);

  const handleSwitchToOriginal = useCallback(() => {
    if (!versionToggleFileId) return;
    // Save current organized content
    if (!isViewingOriginal && activeTabObject) {
      setOrganizedContentBackup(activeTabObject.content);
    }
    // Load original from backup
    const backup = getBackupForFile(versionToggleFileId);
    if (backup?.full?.original) {
      handleEditorChange(backup.full.original);
      setIsViewingOriginal(true);
    }
  }, [versionToggleFileId, isViewingOriginal, activeTabObject, handleEditorChange]);

  const handleSwitchToOrganized = useCallback(() => {
    if (organizedContentBackup) {
      handleEditorChange(organizedContentBackup);
      setIsViewingOriginal(false);
    }
  }, [organizedContentBackup, handleEditorChange]);

  // Hide version toggle when switching to a different file
  React.useEffect(() => {
    if (versionToggleFileId && activeTabObject && activeTabObject.id !== versionToggleFileId) {
      handleDismissVersionToggle();
    }
  }, [activeTabObject, versionToggleFileId, handleDismissVersionToggle]);

  // Handle organization completion
  React.useEffect(() => {
    if (result && result.organizedText && activeTabObject && !isProcessing) {
      // Update the editor content with the organized text
      handleEditorChange(result.organizedText);

      // Show success message
      const processingTime = result.processInfo?.duration || 0;
      const linesProcessed = result.processInfo?.linesProcessed || 0;

      if (linesProcessed > 80) {
        alert(`הטקסט אורגן בהצלחה!\nזמן עיבוד: ${(processingTime / 1000).toFixed(1)} שניות\nשורות עובדו: ${linesProcessed}\n\nטיפ: לחזרה לטקסט המקורי, לחץ Ctrl+Z`);
      } else {
        console.log('טיפ: לחזרה לטקסט המקורי, לחץ Ctrl+Z');
      }

      // Signal that AI organize is complete → auto-show preview
      setAiOrganizeCompleted(Date.now());
      handleAutoShowPreview();

      // Enable version toggle so user can compare original vs organized
      setOrganizedContentBackup(result.organizedText);
      setVersionToggleFileId(activeTabObject.id);
      setIsViewingOriginal(false);
      setShowVersionToggle(true);

      // Close progress modal after a short delay
      setTimeout(() => {
        setShowProgressModal(false);
      }, 2000);

      // Reset the result to prevent re-triggering
      resetState();
    }
  }, [result, activeTabObject, isProcessing, handleEditorChange, resetState]);

  // Handle organization error
  React.useEffect(() => {
    if (error) {
      alert(`שגיאה בארגון הטקסט: ${error}`);
      setShowProgressModal(false);
      // Reset the error to prevent re-triggering
      resetState();
    }
  }, [error, resetState]);

  const isAiFeatureActive = ['flashcards', 'summary', 'sourceResults'].includes(mainViewMode);

  // If any modal is open (controlled by App.jsx state), don't render other main views to avoid overlap.
  // The isContentAreaDisabled prop can also be used to make the content non-interactive.
  if (isContentAreaDisabled) {
    // Could render a dimmed overlay or simply nothing for certain mainViewModes
    // For now, let's assume App.jsx handles modals overlaying everything.
    // MainContentArea will still render tabs if mainViewMode is editor.
  }


  return (
    <div className={className} style={{ opacity: isContentAreaDisabled ? 0.5 : 1, pointerEvents: isContentAreaDisabled ? 'none' : 'auto' /* Other styles from CSS */ }}>
      {(mainViewMode === 'editor' && openTabs.length > 0) && !isSplitMode && (
        <div style={{ display: 'flex', borderBottom: `1px solid var(--theme-border-color)`, backgroundColor: `var(--theme-bg-secondary)`, flexShrink: 0, direction: APP_DIRECTION, overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: `var(--theme-scrollbar-thumb) var(--theme-bg-secondary)` }}>
          {openTabs.map(tab => {
            const isActive = activeTabPath === tab.id;
            const isSavingCurrent = savingTabPath === tab.id && tab.type === 'file';
            let tabClassName = isSavingCurrent ? (isActive ? 'tab-saving' : 'tab-inactive-saving') : '';
            return (
              <div key={tab.id} onClick={() => handleTabClick(tab.id)} className={tabClassName} style={{ padding: '10px 15px', cursor: 'pointer', borderLeft: APP_DIRECTION === 'rtl' ? `1px solid var(--theme-border-color)` : 'none', borderRight: APP_DIRECTION === 'ltr' ? `1px solid var(--theme-border-color)` : (isActive ? 'none' : `1px solid var(--theme-border-color)`), borderBottom: isActive ? `2px solid var(--theme-accent-primary)` : 'none', backgroundColor: isSavingCurrent ? undefined : (isActive ? `var(--theme-bg-primary)` : 'transparent'), color: isSavingCurrent ? undefined : (isActive ? `var(--theme-text-primary)` : `var(--theme-text-secondary)`), display: 'flex', alignItems: 'center', justifyContent: 'space-between', whiteSpace: 'nowrap', fontWeight: (tab.isDirty && tab.type === 'file') ? '600' : '500', /* fontSize removed */ transition: 'background-color 0.15s ease-in-out, color 0.15s ease-in-out, border-bottom 0.15s ease-in-out', flexShrink: 0, gap: '12px' }} title={`${path.basename(tab.basePath)}/${tab.relativePath}` + ((tab.isDirty && tab.type === 'file') ? ` (${HEBREW_TEXT.unsavedChanges})` : "")}>
                <span> {tab.name}{tab.isDirty && tab.type === 'file' && <span style={{ color: `var(--theme-accent-secondary)`, marginLeft: '5px', fontWeight: 'bold' }}>*</span>} </span>
                <button onClick={(e) => handleCloseTab(tab.id, e)} style={{ background: 'transparent', border: 'none', color: `var(--theme-text-secondary)`, cursor: 'pointer', padding: '2px', lineHeight: '1', fontSize: '16px', borderRadius: '3px', transition: 'all 0.2s ease-in-out', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = `var(--theme-text-primary)`; e.currentTarget.style.backgroundColor = `var(--theme-bg-secondary)`; }} onMouseLeave={(e) => { e.currentTarget.style.color = `var(--theme-text-secondary)`; e.currentTarget.style.backgroundColor = 'transparent'; }} title={`${HEBREW_TEXT.close} ${tab.name}`}>×</button>
              </div>
            );
          })}
          {/* Add New Tab Button */}
          <button
            onClick={handleOpenNewTab}
            title={HEBREW_TEXT.openNewTab || "פתח לשונית חדשה"}
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              borderLeft: APP_DIRECTION === 'rtl' ? `1px solid var(--theme-border-color)` : 'none',
              borderRight: APP_DIRECTION === 'ltr' ? `1px solid var(--theme-border-color)` : 'none',
              color: `var(--theme-text-secondary)`,
              fontSize: '1.2em', // Larger '+'
              lineHeight: '1',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'color 0.15s ease-in-out, background-color 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = `var(--theme-text-primary)`; e.currentTarget.style.backgroundColor = `var(--theme-bg-hover)`; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = `var(--theme-text-secondary)`; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            +
          </button>
        </div>
      )}

      {/* Split mode: two symmetrical tab strips — one per pane, aligned with the editor split below */}
      {(mainViewMode === 'editor' && openTabs.length > 0) && isSplitMode && (
        <div style={{ display: 'flex', borderBottom: `1px solid var(--theme-border-color)`, backgroundColor: `var(--theme-bg-secondary)`, flexShrink: 0, direction: APP_DIRECTION }}>
          {/* Main editor tab strip */}
          <div style={{ flex: splitRatio, minWidth: 0, display: 'flex', overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: `var(--theme-scrollbar-thumb) var(--theme-bg-secondary)` }}>
            {openTabs.map(tab => {
              const isActive = activeTabPath === tab.id;
              const isSavingCurrent = savingTabPath === tab.id && tab.type === 'file';
              const tabCls = isSavingCurrent ? (isActive ? 'tab-saving' : 'tab-inactive-saving') : '';
              return (
                <div key={tab.id} onClick={() => handleTabClick(tab.id)} className={tabCls}
                  style={{ padding: '10px 15px', cursor: 'pointer', borderLeft: APP_DIRECTION === 'rtl' ? `1px solid var(--theme-border-color)` : 'none', borderRight: APP_DIRECTION === 'ltr' ? `1px solid var(--theme-border-color)` : (isActive ? 'none' : `1px solid var(--theme-border-color)`), borderBottom: isActive ? `2px solid var(--theme-accent-primary)` : 'none', backgroundColor: isSavingCurrent ? undefined : (isActive ? `var(--theme-bg-primary)` : 'transparent'), color: isSavingCurrent ? undefined : (isActive ? `var(--theme-text-primary)` : `var(--theme-text-secondary)`), display: 'flex', alignItems: 'center', justifyContent: 'space-between', whiteSpace: 'nowrap', fontWeight: (tab.isDirty && tab.type === 'file') ? '600' : '500', transition: 'background-color 0.15s ease-in-out, color 0.15s ease-in-out, border-bottom 0.15s ease-in-out', flexShrink: 0, gap: '12px' }}
                  title={`${path.basename(tab.basePath)}/${tab.relativePath}` + ((tab.isDirty && tab.type === 'file') ? ` (${HEBREW_TEXT.unsavedChanges})` : '')}>
                  <span>{tab.name}{tab.isDirty && tab.type === 'file' && <span style={{ color: `var(--theme-accent-secondary)`, marginLeft: '5px', fontWeight: 'bold' }}>*</span>}</span>
                  <button onClick={(e) => handleCloseTab(tab.id, e)} style={{ background: 'transparent', border: 'none', color: `var(--theme-text-secondary)`, cursor: 'pointer', padding: '2px', lineHeight: '1', fontSize: '16px', borderRadius: '3px', transition: 'all 0.2s ease-in-out', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = `var(--theme-text-primary)`; e.currentTarget.style.backgroundColor = `var(--theme-bg-secondary)`; }} onMouseLeave={(e) => { e.currentTarget.style.color = `var(--theme-text-secondary)`; e.currentTarget.style.backgroundColor = 'transparent'; }} title={`${HEBREW_TEXT.close} ${tab.name}`}>×</button>
                </div>
              );
            })}
            <button onClick={handleOpenNewTab} title={HEBREW_TEXT.openNewTab || 'פתח לשונית חדשה'}
              style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', borderLeft: APP_DIRECTION === 'rtl' ? `1px solid var(--theme-border-color)` : 'none', borderRight: APP_DIRECTION === 'ltr' ? `1px solid var(--theme-border-color)` : 'none', color: `var(--theme-text-secondary)`, fontSize: '1.2em', lineHeight: '1', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.15s ease-in-out, background-color 0.15s ease-in-out' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = `var(--theme-text-primary)`; e.currentTarget.style.backgroundColor = `var(--theme-bg-hover)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = `var(--theme-text-secondary)`; e.currentTarget.style.backgroundColor = 'transparent'; }}>+</button>
          </div>
          {/* Divider — same width as the editor split divider */}
          <div style={{ width: '4px', backgroundColor: 'var(--theme-border-color)', flexShrink: 0, cursor: 'col-resize' }} onMouseDown={handleSplitDragStart} />
          {/* Second editor pane tab strip */}
          <div style={{ flex: 1 - splitRatio, minWidth: 0, display: 'flex', overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: `var(--theme-scrollbar-thumb) var(--theme-bg-secondary)` }}>
            {openTabs.filter(t => t.type === 'file').map(tab => {
              const isActive2 = rightPaneTabPath === tab.id;
              return (
                <div key={tab.id} onClick={() => onRightPaneTabClick(tab.id)}
                  style={{ padding: '10px 15px', cursor: 'pointer', borderLeft: APP_DIRECTION === 'rtl' ? `1px solid var(--theme-border-color)` : 'none', borderRight: APP_DIRECTION === 'ltr' ? `1px solid var(--theme-border-color)` : (isActive2 ? 'none' : `1px solid var(--theme-border-color)`), borderBottom: isActive2 ? `2px solid var(--theme-accent-primary)` : 'none', backgroundColor: isActive2 ? `var(--theme-bg-primary)` : 'transparent', color: isActive2 ? `var(--theme-text-primary)` : `var(--theme-text-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', whiteSpace: 'nowrap', fontWeight: tab.isDirty ? '600' : '500', transition: 'background-color 0.15s ease-in-out, color 0.15s ease-in-out, border-bottom 0.15s ease-in-out', flexShrink: 0, gap: '12px' }}
                  title={tab.id}
                  onMouseEnter={(e) => { if (!isActive2) e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'; }}
                  onMouseLeave={(e) => { if (!isActive2) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <span>{tab.name}{tab.isDirty && <span style={{ color: `var(--theme-accent-secondary)`, marginLeft: '5px', fontWeight: 'bold' }}>*</span>}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id, e); }} style={{ background: 'transparent', border: 'none', color: `var(--theme-text-secondary)`, cursor: 'pointer', padding: '2px', lineHeight: '1', fontSize: '16px', borderRadius: '3px', transition: 'all 0.2s ease-in-out', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = `var(--theme-text-primary)`; e.currentTarget.style.backgroundColor = `var(--theme-bg-secondary)`; }} onMouseLeave={(e) => { e.currentTarget.style.color = `var(--theme-text-secondary)`; e.currentTarget.style.backgroundColor = 'transparent'; }} title={`${HEBREW_TEXT.close} ${tab.name}`}>×</button>
                </div>
              );
            })}
            <button onClick={handleOpenNewTab} title={HEBREW_TEXT.openNewTab || 'פתח לשונית חדשה'}
              style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', borderLeft: APP_DIRECTION === 'rtl' ? `1px solid var(--theme-border-color)` : 'none', borderRight: APP_DIRECTION === 'ltr' ? `1px solid var(--theme-border-color)` : 'none', color: `var(--theme-text-secondary)`, fontSize: '1.2em', lineHeight: '1', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.15s ease-in-out, background-color 0.15s ease-in-out' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = `var(--theme-text-primary)`; e.currentTarget.style.backgroundColor = `var(--theme-bg-hover)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = `var(--theme-text-secondary)`; e.currentTarget.style.backgroundColor = 'transparent'; }}>+</button>
          </div>
        </div>
      )}

      {/* EditorToolbar is now rendered in App.jsx, outside MainContentArea when mainViewMode is 'editor' */}
      <div style={{ flexGrow: 1, overflowY: 'auto', /* padding handled by specific views or removed if not needed */ position: 'relative', backgroundColor: (isAiFeatureActive || mainViewMode === 'weeklySummary') ? 'var(--theme-bg-secondary)' : 'var(--theme-bg-primary)', display: 'flex', flexDirection: 'column' }}>
        {isLoadingFileContent && mainViewMode === 'editor' && (<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: `var(--theme-text-secondary)`, zIndex: 10 }}>{HEBREW_TEXT.loading} תוכן קובץ...</div>)}
        {fileError && mainViewMode === 'editor' && !isLoadingFileContent && (<div style={{ padding: '15px', color: `var(--theme-accent-secondary)`, textAlign: 'center' }}>{HEBREW_TEXT.error} בטעינת קובץ: {fileError}</div>)}

        {mainViewMode === 'editor' && activeTabObject && (
          <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {activeTabObject.type === 'image' && activeTabObject.imageUrl && !isLoadingFileContent && !fileError && (<img src={activeTabObject.imageUrl} alt={`תמונה: ${activeTabObject.name}`} style={{ display: 'block', margin: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.onerror = null; e.target.alt = `${HEBREW_TEXT.error} בטעינת התמונה: ${activeTabObject.name}`; }} />)}

            {activeTabObject.type === 'pdf' && activeTabObject.pdfUrl && !isLoadingFileContent && !fileError && (
              <iframe
                src={activeTabObject.pdfUrl}
                title={activeTabObject.name}
                style={{ flex: 1, width: '100%', border: 'none', minHeight: 0 }}
              />
            )}

            {activeTabObject.type === 'audio' && activeTabObject.audioUrl && !isLoadingFileContent && !fileError && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', padding: '40px' }}>
                <div style={{ fontSize: '4rem' }}></div>
                <div style={{ color: 'var(--theme-text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>{activeTabObject.name}</div>
                <audio controls src={activeTabObject.audioUrl} style={{ width: '100%', maxWidth: '600px', outline: 'none' }} />
              </div>
            )}

            {activeTabObject.type === 'video' && activeTabObject.videoUrl && !isLoadingFileContent && !fileError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: '#000', minHeight: 0 }}>
                <video controls src={activeTabObject.videoUrl} style={{ maxWidth: '100%', maxHeight: '100%', outline: 'none' }}>
                  הדפדפן שלך אינו תומך בהפעלת וידאו.
                </video>
              </div>
            )}

            {activeTabObject.type === 'file' && activeTabObject.content !== undefined && !fileError && !isLoadingFileContent && (
              <>
                {/* Show Markdown Toolbar only for .md files when formatting toolbar is enabled — hidden in split mode */}
                {!isSplitMode && activeTabObject.id?.toLowerCase().endsWith('.md') && showFormattingToolbar && (
                  <MarkdownToolbar
                    editorRef={editorSharedRef}
                    isDisabled={isContentAreaDisabled}
                    onPreviewToggle={handlePreviewToggle}
                    onUserHidePreview={handleUserHidePreview}
                    onMarkdownInserted={handleAutoShowPreview}
                    showPreview={showMarkdownPreview}
                    isFullPreview={isFullPreview}
                    onFullPreview={handleFullPreview}
                    onOrganizeTextToggle={handleOrganizeTextToggle}
                    isOrganizing={isProcessing}
                    hasUnsavedChanges={activeTabObject.isDirty}
                    onAiOrganizeComplete={aiOrganizeCompleted}
                    showLineNumbers={showLineNumbers}
                    toggleFormattingToolbar={toggleFormattingToolbar}
                    toggleShowLineNumbers={toggleShowLineNumbers}
                  />
                )}

                {/* Version toggle banner — shown after AI text organization */}
                {showVersionToggle && activeTabObject?.id === versionToggleFileId && (
                  <div className="version-toggle-banner">
                    <div className="version-toggle-info">
                      <span className="version-toggle-icon">🔄</span>
                      <span className="version-toggle-label">השוואת גרסאות:</span>
                    </div>
                    <div className="version-toggle-buttons">
                      <button
                        className={`version-toggle-btn ${!isViewingOriginal ? 'active organized' : ''}`}
                        onClick={handleSwitchToOrganized}
                        title="הצג את הטקסט המאורגן על ידי AI"
                      >
                        ✨ גרסה מאורגנת
                      </button>
                      <button
                        className={`version-toggle-btn ${isViewingOriginal ? 'active original' : ''}`}
                        onClick={handleSwitchToOriginal}
                        title="הצג את הטקסט המקורי לפני ארגון"
                      >
                        📄 גרסה מקורית
                      </button>
                    </div>
                    <button
                      className="version-toggle-dismiss"
                      onClick={handleDismissVersionToggle}
                      title="סגור השוואת גרסאות"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Full document preview mode — renders only the MD preview, no editor */}
                {!isSplitMode && activeTabObject.id?.toLowerCase().endsWith('.md') && isFullPreview && (
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <MarkdownPreview
                      content={activeTabObject.content}
                      presentationFontSize={presentationFontSize}
                    />
                  </div>
                )}

                <div ref={splitContainerRef} style={{ flexGrow: isFullPreview ? 0 : 1, minHeight: 0, display: isFullPreview ? 'none' : 'flex', flexDirection: 'row' }}>
                  {/* LEFT PANE — always shown */}
                  <div style={{ flex: isSplitMode ? splitRatio : 1, height: '100%', minWidth: 0, display: 'flex', flexDirection: 'row' }}>
                    <div style={{ flex: 1, height: '100%', minWidth: 0, position: 'relative' }}>
                      <Editor
                        ref={editorSharedRef}
                        key={activeTabObject.id}
                        filePath={activeTabObject.id}
                        initialContent={activeTabObject.content}
                        onChange={handleEditorChange}
                        isRtl={APP_DIRECTION === 'rtl'}
                        searchTermToHighlight={searchTermToHighlightInEditor}
                        scrollToLine={scrollToLine}
                        showLineNumbers={showLineNumbers}
                        highlightActiveLine={highlightActiveLine}
                        currentFontSize={editorFontSize}
                        editorFont={editorFont}
                        initialScrollPosition={initialScrollPosition}
                        onScrollPositionChange={onScrollPositionChange}
                        onSelectedTextPilpulta={generatePilpultaFromSelectedText}
                        onSelectedTextFindSources={findJewishSourcesFromSelectedText}
                        onSelectedTextFlashcards={generateFlashcardsFromSelectedText}
                        onSelectedTextSummary={generateSummaryFromSelectedText}
                        isAnyAiFeatureLoading={isLoadingFlashcards || isLoadingAiSummary || isLoadingSourceFinding}
                        onCursorChange={setCursorPos}
                        annotations={annotations}
                        isAnnotationMode={isAnnotationMode}
                        onAddAnnotation={onAddAnnotation}
                        selectedAnnotationId={selectedAnnotationId}
                        onAddBookmark={onAddBookmark ? (text) => onAddBookmark({ text, sourceFileId: activeTabObject.id, sourceFileName: activeTabObject.name }) : undefined}
                      />
                      {drawingsHook && isAnnotationMode && (
                        <DrawingCanvas
                          strokes={drawingsHook.strokes}
                          onAddStroke={drawingsHook.addStroke}
                          activeTool={drawingsHook.activeTool}
                          color={drawingsHook.color}
                          lineWidth={drawingsHook.lineWidth}
                        />
                      )}
                    </div>
                    {!isSplitMode && activeTabObject.id?.toLowerCase().endsWith('.md') && showMarkdownPreview && (
                      <>
                        <div style={{
                          width: '2px',
                          backgroundColor: 'var(--theme-border-color, #3F3F46)',
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, height: '100%', minWidth: 0, overflow: 'auto' }}>
                          <MarkdownPreview
                            content={activeTabObject.content}
                            presentationFontSize={presentationFontSize}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Annotations Panel — shown when annotation mode is on */}
                  {isAnnotationMode && !isSplitMode && (
                    <>
                      <div style={{ width: '2px', backgroundColor: 'var(--theme-border-color, #3F3F46)', flexShrink: 0 }} />
                      <AnnotationsPanel
                        annotations={annotations}
                        selectedAnnotationId={selectedAnnotationId}
                        onSelectAnnotation={onSelectAnnotation}
                        onUpdateAnnotation={onUpdateAnnotation}
                        onDeleteAnnotation={onDeleteAnnotation}
                        drawingsHook={drawingsHook}
                        onScrollToAnnotation={(ann) => {
                          if (editorSharedRef?.current?.getEditorView) {
                            const view = editorSharedRef.current.getEditorView();
                            if (view && ann.from >= 0 && ann.from < view.state.doc.length) {
                              view.dispatch({
                                effects: EditorView.scrollIntoView(ann.from, { y: 'center' }),
                              });
                            }
                          }
                        }}
                      />
                    </>
                  )}

                  {/* RIGHT PANE — shown in split mode */}
                  {isSplitMode && (
                    <>
                      <div onMouseDown={handleSplitDragStart} style={{ width: '4px', backgroundColor: 'var(--theme-border-color, #3F3F46)', flexShrink: 0, cursor: 'col-resize' }} />
                      <div style={{ flex: 1 - splitRatio, height: '100%', minWidth: 0 }}>
                        {rightPaneTabObject && rightPaneTabObject.content !== undefined ? (
                          <Editor
                            ref={rightEditorRef}
                            key={`right-${rightPaneTabObject.id}`}
                            filePath={rightPaneTabObject.id}
                            initialContent={rightPaneTabObject.content}
                            onChange={handleRightPaneEditorChange}
                            isRtl={APP_DIRECTION === 'rtl'}
                            showLineNumbers={showLineNumbers}
                            highlightActiveLine={highlightActiveLine}
                            currentFontSize={editorFontSize}
                            editorFont={editorFont}
                          />
                        ) : (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-tertiary)' }}>
                            בחר קובץ לתצוגה
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {isBookmarkPanelOpen && (
                  <BookmarkPanel
                    bookmarks={bookmarks}
                    onDelete={onDeleteBookmark}
                    onTogglePin={onToggleBookmarkPin}
                    onUpdate={onUpdateBookmark}
                    onClose={onCloseBookmarkPanel}
                    onNavigateToFile={handleFileSelect}
                  />
                )}
              </>
            )}

            {((activeTabObject.type === 'file' && activeTabObject.content === undefined) || (activeTabObject.type === 'image' && activeTabObject.imageUrl === undefined) || (activeTabObject.type === 'audio' && activeTabObject.audioUrl === undefined) || (activeTabObject.type === 'video' && activeTabObject.videoUrl === undefined)) && !isLoadingFileContent && !fileError && (<div style={{ padding: '15px', color: 'var(--theme-text-secondary)', textAlign: 'center' }}>{HEBREW_TEXT.loading} תוכן עבור {activeTabObject.name}...</div>)}
          </div>
        )}
        {mainViewMode === 'editor' && !activeTabObject && !isLoadingFileContent && !fileError && (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--theme-text-tertiary)', /* fontSize removed */ }}><p>פתח קובץ או בחר כלי עזר.</p></div>)}

        {mainViewMode === 'flashcards' && (<FlashcardView cards={flashcardData} isLoading={isLoadingFlashcards} error={flashcardError} onClose={() => setMainViewMode('editor')} onRetry={generateFlashcards} addRepetition={repetitionsHook?.addRepetition} />)}
        {mainViewMode === 'summary' && (<SummaryView initialSummary={summaryText} isLoading={isLoadingAiSummary} error={aiSummaryError} onSave={saveSummary} onDiscard={discardSummary} onRedo={generateSummary} onCloseEditor={() => setMainViewMode('editor')} />)}
        {mainViewMode === 'sourceResults' && (<SourceResultsDisplay resultsText={sourceFindingResults} isLoading={isLoadingSourceFinding} error={sourceFindingError} onSave={saveSourceFindingResults} onDiscard={discardSourceFindingResults} onRedo={findJewishSources} onCloseEditor={() => setMainViewMode('editor')} />)}

        {mainViewMode === 'search' && (
          <SearchView
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchInputRef={searchInputRef}
            searchResults={searchResults}
            isSearching={isSearching}
            searchError={searchViewError}
            currentSearchScope={currentSearchScope}
            clearSearchScope={clearSearchScope}
            handleSearch={handleSearch}
            searchOptions={searchOptions}
            handleSearchOptionChange={handleSearchOptionChange}
            includePatternsInput={includePatternsInput}
            handleIncludePatternsChange={handleIncludePatternsChange}
            excludePatternsInput={excludePatternsInput}
            handleExcludePatternsChange={handleExcludePatternsChange}
            handleFileSelect={handleFileSelect}
            workspaceFolders={workspaceFolders}
          />
        )}

        {mainViewMode === 'snapshot' && userSnapshotHook && (
          <UserSnapshotView
            snapshotData={userSnapshotHook.snapshotData}
            isLoading={userSnapshotHook.isLoading}
            error={userSnapshotHook.error}
            onRefresh={userSnapshotHook.fetchSnapshot}
            onFileSelect={handleFileSelect}
            workspaceFolders={workspaceFolders}
          />
        )}

        {mainViewMode === 'repetitions' && repetitionsHook && (<RepetitionListView repetitionsHook={repetitionsHook} onClose={onCloseRepetitionView} />)}

        {mainViewMode === 'weeklySummary' && questionnaireHook && (
          <WeeklySummaryDisplay
            summary={questionnaireHook.weeklySummary}
            isLoading={questionnaireHook.isLoadingSummary}
            error={questionnaireHook.summaryError}
            onFetchPreviousAnswers={(startDate, endDate) => { // Renamed parameters to be more generic
              questionnaireHook.fetchWeeklyAnswers(startDate, endDate);
              // Consider changing mainViewMode to a new 'dailyAnswersView' or handle display within WeeklySummaryDisplay
            }}
            currentWeekDateRange={questionnaireHook.currentWeeklyAnswersRange} // Pass this for context if summary is null
          />
        )}
        {/* Placeholder for displaying detailedWeeklyAnswers if not handled within WeeklySummaryDisplay */}
        {mainViewMode === 'dailyAnswersView' /* Example view mode */ && questionnaireHook && questionnaireHook.detailedWeeklyAnswers.length > 0 && (
          <div style={{ padding: '20px' }}>
            <h3>{HEBREW_TEXT.questionnaire.dailyAnswersTitle(questionnaireHook.currentWeeklyAnswersRange.startDate)}</h3>
            {/* Render detailed answers here */}
            {questionnaireHook.detailedWeeklyAnswers.map(ans => (
              <div key={ans.date} style={{ borderBottom: '1px solid var(--theme-border-color)', marginBottom: '10px', paddingBottom: '10px' }}>
                <strong>{new Date(ans.date + "T00:00:00").toLocaleDateString('he-IL')}</strong>: Rating {ans.rating_today || 'N/A'}, Details: {ans.details_today || 'N/A'}
              </div>
            ))}
            <button onClick={() => setMainViewMode('weeklySummary')}>
              {HEBREW_TEXT.questionnaire.backToSummary}
            </button>
          </div>
        )}


      </div>

      {/* Status Bar */}
      {mainViewMode === 'editor' && activeTabObject && activeTabObject.type === 'file' && (
        <StatusBar
          line={cursorPos.line}
          col={cursorPos.col}
          content={activeTabObject.content}
          fileName={activeTabObject.name}
          aiModel={selectedAiModel}
          isDirty={activeTabObject.isDirty}
          isAutoSaving={isAutoSaving}
        />
      )}

      {/* Text Organization Progress Modal */}
      <TextOrganizationProgressModal
        isOpen={showProgressModal}
        onClose={handleProgressModalClose}
        onCancel={isProcessing ? handleCancelOrganization : null}
        textLength={progress.textLength}
        selectedAiModel={progress.model}
        isProcessing={isProcessing}
        currentStep={progress.currentStep}
        totalSteps={progress.totalSteps}
        stepDetails={progress.steps}
        estimatedTimeRemaining={progress.estimatedTimeRemaining}
        processingSpeed={progress.processingSpeed}
        completedSteps={progress.completedSteps}
      />
    </div>
  );
};
export default MainContentArea;

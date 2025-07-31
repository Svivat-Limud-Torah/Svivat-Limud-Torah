// frontend/src/components/MainContentArea.jsx
import React, { useState } from 'react';
import Editor from './Editor';
import MarkdownToolbar from './MarkdownToolbar';
import MarkdownPreview from './MarkdownPreview';
// EditorToolbar is now part of App.jsx structure, not directly in MainContentArea if mainViewMode !== 'editor'
// import EditorToolbar from './EditorToolbar'; 
import FlashcardView from './FlashcardView';
import SummaryView from './SummaryView';
import SourceResultsDisplay from './SourceResultsDisplay';
import RepetitionListView from './RepetitionListView';
import WeeklySummaryDisplay from './WeeklySummaryDisplay'; // Import WeeklySummaryDisplay
import TextOrganizationProgressModal from './TextOrganizationProgressModal'; // Import progress modal
// DailyAnswersDisplay would be a new component if we need a dedicated view for it.
// For now, detailed answers might be shown within WeeklySummaryDisplay or managed by the hook.
import { getApiKeyDetails } from './ApiKeyModal'; // Import the helper function
import { useTextOrganizationWithProgress } from '../hooks/useTextOrganizationWithProgress'; // Import the progress hook

import path from '../utils/pathUtils';
import { APP_DIRECTION, SUPPORTED_IMAGE_EXTENSIONS_CLIENT, HEBREW_TEXT } from '../utils/constants';
import { storeFullFileBackup } from '../utils/aiOrganizeBackup';

// Helper to parse matchPreview with markers (from your provided code)
const HighlightedMatchPreview = ({ preview }) => {
    if (!preview) return null;
    const parts = preview.split(/(@@MATCH_START@@|@@MATCH_END@@)/g);
    let isHighlighted = false;
    return (
        <>
            {parts.map((part, index) => {
                if (part === '@@MATCH_START@@') {
                    isHighlighted = true;
                    return null;
                }
                if (part === '@@MATCH_END@@') {
                    isHighlighted = false;
                    return null;
                }
                return isHighlighted ? (
                    <span key={index} style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)', fontWeight: 'bold' }}>{part}</span>
                ) : (
                    <span key={index}>{part}</span>
                );
            })}
        </>
    );
};


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
  
  // --- Search V2 Props ---
  searchResults, 
  handleFileSelect, 
  searchTerm, 
  searchError: searchViewError, 
  isSearching, 
  currentSearchScope, 
  clearSearchScope, 
  handleSearch, 
  searchOptions, 
  handleSearchOptionChange, 
  includePatternsInput,
  handleIncludePatternsChange,
  excludePatternsInput,
  handleExcludePatternsChange,

  // Stats props
  recentFiles,
  frequentFiles,
  isLoadingStats,
  statsError: statsViewErrorProp, 
  fetchStatsFiles,
  
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
  isZenMode, // Added zen mode state
  showFormattingToolbar, // Added formatting toolbar state  
  toggleZenMode, // Added zen mode toggle function
  toggleFormattingToolbar, // Added formatting toolbar toggle function
  toggleShowLineNumbers, // Added line numbers toggle function
}) => {
  // State for markdown preview mode
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [aiOrganizeCompleted, setAiOrganizeCompleted] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Use the text organization progress hook
  const {
    isProcessing,
    progress,
    result,
    error,
    organizeText,
    cancelProcess,
    resetState
  } = useTextOrganizationWithProgress();

  const handlePreviewToggle = (isPreview) => {
    setShowMarkdownPreview(isPreview);
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

    // Create optimized prompt
    const optimizedPrompt = `
אתה מומחה בארגון ועריכת טקסטים בעברית. המשימה שלך היא לארגן את הטקסט הבא לפורמט Markdown מושלם.

🔥 חוקים קריטיים - אל תעבור על אלה:
• שמור על כל התוכן המקורי - אל תמחק או תחסיר מידע
• אל תחזור על תוכן - כל חלק צריך להופיע פעם אחת בלבד  
• וודא שהטקסט המאורגן כולל את כל התוכן המקורי
• אל תוסיף מידע שלא היה בטקסט המקורי

📋 משימות הארגון:
1. צור היררכיה ברורה עם כותרות H1, H2, H3 לפי הקשר הלוגי
2. חלק לפסקאות מובנות ונושאיות
3. ארגן רשימות בפורמט Markdown נכון (-, *, 1., 2., וכו')
4. הדגש מילות מפתח חשובות (**מילה**, *מילה*)
5. צור מבנה לוגי וזורם שקל לקריאה
6. שפר פיסוק ומבנה משפטים ללא שינוי המשמעות
7. הסר שורות ריקות מיותרות (לא יותר מ-2 שורות ריקות ברצף)

📖 כללי פורמט:
• השתמש בעברית תקינה וברורה
• שמור על המינוח המקורי של מושגים יהודיים/תורניים
• ארגן ציטוטים ומקורות בפורמט אחיד
• צור מבנה חזותי נעים ומאורגן

החזר אך ורק את הטקסט המאורגן ללא הסברים או הערות נוספות.
`;

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

  // Handle organization completion
  React.useEffect(() => {
    if (result && result.organizedText && activeTabObject && !isProcessing) {
      // Update the editor content with the organized text
      handleEditorChange(result.organizedText);
      
      // Show success message
      const processingTime = result.processInfo?.duration || 0;
      const linesProcessed = result.processInfo?.linesProcessed || 0;
      
      if (linesProcessed > 80) {
        alert(`הטקסט אורגן בהצלחה!\nזמן עיבוד: ${(processingTime / 1000).toFixed(1)} שניות\nשורות עובדו: ${linesProcessed}\n\n💡 טיפ: לחזרה לטקסט המקורי, לחץ Ctrl+Z`);
      } else {
        console.log('💡 טיפ: לחזרה לטקסט המקורי, לחץ Ctrl+Z');
      }
      
      // Signal that AI organize is complete
      setAiOrganizeCompleted(Date.now());
      
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

  const renderStatsList = (title, files, isLoading, error) => {
    if (workspaceFolders.length === 0 && !isLoading) return <p style={{/* fontSize removed */ color: '#a0aec0', padding: '5px 0'}}>{HEBREW_TEXT.addFolderFirst} {HEBREW_TEXT.explorer.toLowerCase()} כדי לראות {title.toLowerCase()}.</p>;
    if (isLoading) return <p style={{/* fontSize removed */ padding: '5px 0', color: '#a0aec0'}}>{HEBREW_TEXT.loading} {title.toLowerCase()}...</p>;
    if (error && files.length ===0) return <p style={{ color: '#fc8181', /* fontSize removed */ padding: '5px 0' }}>{HEBREW_TEXT.error}: {error}</p>;
    if (!files || files.length === 0) return <p style={{/* fontSize removed */ color: '#a0aec0', padding: '5px 0'}}>לא נמצאו {title.toLowerCase()}.</p>;
    
    // Remove duplicates based on absolute_file_path
    const uniqueFiles = files.filter((file, index, self) => 
      index === self.findIndex(f => 
        (f.absolute_file_path && file.absolute_file_path && f.absolute_file_path === file.absolute_file_path) ||
        (f.base_folder_path === file.base_folder_path && f.path === file.path)
      )
    );
    
    return (
      <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', /* fontSize removed */ }}>
        {uniqueFiles.map((file, index) => {
          const ext = file.file_name ? path.extname(file.file_name).toLowerCase() : '';
          const itemType = SUPPORTED_IMAGE_EXTENSIONS_CLIENT.includes(ext) ? 'image' : 'file';
          const targetFolder = { path: file.base_folder_path || file.basePath, name: file.rootName || path.basename(file.base_folder_path || file.basePath || "") };
          
          // Create a unique key using absolute_file_path if available, otherwise use index
          const uniqueKey = file.absolute_file_path || `${file.base_folder_path || file.basePath}::${file.path}::${index}`;
          
          return (
            <div
              key={uniqueKey}
              onClick={() => handleFileSelect(targetFolder, { name: file.file_name, path: file.path, type: itemType })}
              style={{ padding: '6px 12px', cursor: 'pointer', color: '#cbd5e0', borderRadius: '3px', transition: 'background-color 0.1s ease-in-out', borderBottom: '1px solid #2d3748' }}
              title={`פתח את ${file.file_name || 'שם לא ידוע'} (${targetFolder.name}/${file.path})\nנפתח לאחרונה: ${file.last_opened_or_edited ? new Date(file.last_opened_or_edited * 1000).toLocaleString() : 'N/A'}\nמספר פתיחות: ${file.access_count !== undefined ? file.access_count : 'N/A'}`}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{fontWeight: 'bold'}}>{targetFolder.name}</span> / {file.file_name || file.path}
              {file.file_name && <span style={{/* fontSize removed */ color: '#718096', marginLeft: '5px'}}>({file.path})</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const isAiFeatureActive = ['flashcards', 'summary', 'sourceResults'].includes(mainViewMode);

  const renderSearchResultsV2 = () => {
    const totalMatchesCount = searchResults.reduce((sum, file) => sum + file.matches.length, 0);
    const filesWithMatchesCount = searchResults.length;
    const currentSearchOptions = searchOptions || { isRegex: false, caseSensitive: false, wholeWord: false };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #2d3748', flexShrink: 0 }}>
                <h2 style={{ marginTop: 0, marginBottom: 0, color: '#e5e7eb', /* fontSize removed */ }}>
                    {currentSearchScope.basePath 
                        ? HEBREW_TEXT.searchIn(currentSearchScope.name ? `${currentSearchScope.name}/${currentSearchScope.relativePath || ''}`.replace(/\/$/, '') : HEBREW_TEXT.searchGlobal)
                        : HEBREW_TEXT.searchIn(HEBREW_TEXT.searchGlobal)}
                </h2>
                {currentSearchScope.basePath && (
                    <button onClick={clearSearchScope} className="btn btn-secondary btn-sm" title={HEBREW_TEXT.clearSearchScope}> {/* Replaced style with btn classes */}
                        {HEBREW_TEXT.clearSearchScope}
                    </button>
                )}
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                 <button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()} className="btn btn-primary"> {/* Replaced style with btn classes */}
                    {isSearching ? HEBREW_TEXT.searching : HEBREW_TEXT.search}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#cbd5e0', /* fontSize removed */ cursor: 'pointer' }}>
                    <input type="checkbox" checked={currentSearchOptions.isRegex} onChange={(e) => handleSearchOptionChange('isRegex', e.target.checked)} style={{cursor: 'pointer'}} /> {HEBREW_TEXT.regex}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#cbd5e0', /* fontSize removed */ cursor: 'pointer' }}>
                    <input type="checkbox" checked={currentSearchOptions.caseSensitive} onChange={(e) => handleSearchOptionChange('caseSensitive', e.target.checked)} style={{cursor: 'pointer'}} /> {HEBREW_TEXT.caseSensitive}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#cbd5e0', /* fontSize removed */ cursor: 'pointer' }}>
                    <input type="checkbox" checked={currentSearchOptions.wholeWord} onChange={(e) => handleSearchOptionChange('wholeWord', e.target.checked)} disabled={currentSearchOptions.isRegex} style={{cursor: currentSearchOptions.isRegex ? 'not-allowed' : 'pointer'}} /> {HEBREW_TEXT.wholeWord}
                </label>
            </div>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', flexShrink: 0 }}>
                 <div style={{flex: 1, minWidth: '200px'}}>
                    <label htmlFor="includePatterns" style={{/* fontSize removed */ color: '#a0aec0', display: 'block', marginBottom: '3px'}}>{HEBREW_TEXT.includeFiles}:</label>
                    <input type="text" id="includePatterns" value={includePatternsInput || ''} onChange={(e) => handleIncludePatternsChange(e.target.value)} placeholder={HEBREW_TEXT.includePlaceholder} style={{width: '100%', padding: '5px 8px', /* fontSize removed */ backgroundColor: '#2d3748', color: '#e2e8f0', border: '1px solid #4a5568', borderRadius: '3px'}} />
                 </div>
                 <div style={{flex: 1, minWidth: '200px'}}>
                    <label htmlFor="excludePatterns" style={{/* fontSize removed */ color: '#a0aec0', display: 'block', marginBottom: '3px'}}>{HEBREW_TEXT.excludeFiles}:</label>
                    <input type="text" id="excludePatterns" value={excludePatternsInput || ''} onChange={(e) => handleExcludePatternsChange(e.target.value)} placeholder={HEBREW_TEXT.excludePlaceholder} style={{width: '100%', padding: '5px 8px', /* fontSize removed */ backgroundColor: '#2d3748', color: '#e2e8f0', border: '1px solid #4a5568', borderRadius: '3px'}} />
                 </div>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', /* fontSize removed */ }}>
                {searchViewError && (
                    <p style={{ 
                        color: searchViewError.includes('עודכן') || searchViewError.includes('נוקה') ? '#a0aec0' : '#fc8181', 
                        /* fontSize removed */ 
                        margin: '10px 0', 
                        whiteSpace: 'pre-wrap',
                        padding: '8px 12px',
                        backgroundColor: searchViewError.includes('עודכן') || searchViewError.includes('נוקה') ? '#1a2332' : 'transparent',
                        borderRadius: '4px',
                        border: searchViewError.includes('עודכן') || searchViewError.includes('נוקה') ? '1px solid #374151' : 'none'
                    }}>
                        {searchViewError}
                    </p>
                )}
                {searchResults.length > 0 && (
                    <>
                        <p style={{ color: '#a0aec0', marginTop: '0', marginBottom: '10px' }}>{HEBREW_TEXT.searchResultsCount(totalMatchesCount, filesWithMatchesCount)}</p>
                        {searchResults.map((fileResult, idx) => {
                            let pathRelativeToWorkspaceRoot;
                            if (fileResult.searchRootPath === fileResult.originalRootPath) { pathRelativeToWorkspaceRoot = fileResult.relativePath; } 
                            else { const searchRootRelativeToWorkspace = path.relative(fileResult.originalRootPath, fileResult.searchRootPath); pathRelativeToWorkspaceRoot = path.join(searchRootRelativeToWorkspace, fileResult.relativePath); }
                            const targetFolderForFileSelect = { path: fileResult.originalRootPath, name: fileResult.rootName };
                            const itemForFileSelect = { name: fileResult.fileName, path: pathRelativeToWorkspaceRoot.replace(/\\/g, '/'), type: 'file' };
                            return (
                                <div key={`${fileResult.searchRootPath}::${fileResult.relativePath}::${idx}`} style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#283141', borderRadius: '4px', border: '1px solid #374151' }}>
                                    <strong onClick={() => handleFileSelect(targetFolderForFileSelect, itemForFileSelect, fileResult.matches.length > 0 ? fileResult.matches[0].lineNumber : null, searchTerm)} style={{ cursor: 'pointer', color: '#7dd3fc', display: 'block', marginBottom: '10px', /* fontSize removed */ }} title={`פתח את ${fileResult.fileName} (${targetFolderForFileSelect.name}/${itemForFileSelect.path})`} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                                        {targetFolderForFileSelect.name} / {itemForFileSelect.path}
                                    </strong>
                                    {fileResult.matches.map((match, matchIdx) => (
                                        <div key={`${match.lineNumber}-${matchIdx}`} onClick={() => handleFileSelect(targetFolderForFileSelect, itemForFileSelect, match.lineNumber, searchTerm)} style={{ /* fontSize removed */ color: '#cbd5e0', cursor: 'pointer', padding: '6px 8px', borderRadius: '3px', transition: 'background-color 0.1s', borderTop: matchIdx > 0 ? '1px dashed #374151' : 'none', marginTop: matchIdx > 0 ? '5px' : '0px', lineHeight: '1.5' }} title={`עבור לשורה ${match.lineNumber}`} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            {match.contextBefore.map((line, i) => ( <div key={`ctx-b-${i}`} style={{opacity: 0.6, whiteSpace: 'pre-wrap', marginLeft: '15px'}}>{line}</div> ))}
                                            <div style={{display: 'flex'}}> <span style={{ color: '#81a1c1', fontWeight: 'bold', minWidth: '40px', textAlign:'right', marginRight: '8px' }}>{match.lineNumber}:</span> <span style={{whiteSpace: 'pre-wrap'}}><HighlightedMatchPreview preview={match.matchPreview} /></span> </div>
                                            {match.contextAfter.map((line, i) => ( <div key={`ctx-a-${i}`} style={{opacity: 0.6, whiteSpace: 'pre-wrap', marginLeft: '15px'}}>{line}</div> ))}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </>
                )}
                {workspaceFolders.length === 0 && <p style={{ color: '#a0aec0', /* fontSize removed */ }}>{HEBREW_TEXT.addFolderFirst} כדי לבצע חיפוש.</p>}
                {isSearching && <p style={{color: '#a0aec0', textAlign: 'center', padding: '10px'}}>{HEBREW_TEXT.searching}</p>}
                {!isSearching && searchResults.length === 0 && !searchViewError && searchTerm && <p style={{color: '#a0aec0', textAlign: 'center', padding: '10px'}}>{HEBREW_TEXT.noResultsFound}</p>}
                {!searchTerm && !isSearching && !searchViewError && searchResults.length === 0 && <p style={{color: '#a0aec0', textAlign: 'center', padding: '10px'}}>{HEBREW_TEXT.searchPlaceholder}</p>}
            </div>
        </div>
    );
  };

  // If any modal is open (controlled by App.jsx state), don't render other main views to avoid overlap.
  // The isContentAreaDisabled prop can also be used to make the content non-interactive.
  if (isContentAreaDisabled) {
    // Could render a dimmed overlay or simply nothing for certain mainViewModes
    // For now, let's assume App.jsx handles modals overlaying everything.
    // MainContentArea will still render tabs if mainViewMode is editor.
  }


  return (
    <div className={className} style={{ opacity: isContentAreaDisabled ? 0.5 : 1, pointerEvents: isContentAreaDisabled ? 'none' : 'auto' /* Other styles from CSS */ }}>
      {(mainViewMode === 'editor' && openTabs.length > 0) && (
        <div style={{ display: 'flex', borderBottom: `1px solid var(--theme-border-color)`, backgroundColor: `var(--theme-bg-secondary)`, flexShrink: 0, direction: APP_DIRECTION, overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: `var(--theme-accent-secondary) var(--theme-bg-secondary)` }}>
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

      {/* EditorToolbar is now rendered in App.jsx, outside MainContentArea when mainViewMode is 'editor' */}

      <div style={{ flexGrow: 1, overflowY: 'auto', /* padding handled by specific views or removed if not needed */ position: 'relative', backgroundColor: (isAiFeatureActive || mainViewMode === 'weeklySummary') ? 'var(--theme-bg-secondary)' : 'var(--theme-bg-primary)', display: 'flex', flexDirection: 'column' }}>
        {isLoadingFileContent && mainViewMode === 'editor' && (<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: `var(--theme-text-secondary)`, zIndex: 10 }}>{HEBREW_TEXT.loading} תוכן קובץ...</div>)}
        {fileError && mainViewMode === 'editor' && !isLoadingFileContent && (<div style={{ padding: '15px', color: `var(--theme-accent-secondary)`, textAlign: 'center' }}>{HEBREW_TEXT.error} בטעינת קובץ: {fileError}</div>)}

        {mainViewMode === 'editor' && activeTabObject && (
          <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {activeTabObject.type === 'image' && activeTabObject.imageUrl && !isLoadingFileContent && !fileError && ( <img src={activeTabObject.imageUrl} alt={`תמונה: ${activeTabObject.name}`} style={{ display: 'block', margin: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.onerror = null; e.target.alt = `${HEBREW_TEXT.error} בטעינת התמונה: ${activeTabObject.name}`; }} /> )}
            
            {activeTabObject.type === 'file' && activeTabObject.content !== undefined && !fileError && !isLoadingFileContent && (
              <>
                {/* Show Markdown Toolbar only for .md files when formatting toolbar is enabled */}
                {activeTabObject.id?.toLowerCase().endsWith('.md') && showFormattingToolbar && (
                  <MarkdownToolbar 
                    editorRef={editorSharedRef}
                    isDisabled={isContentAreaDisabled}
                    onPreviewToggle={handlePreviewToggle}
                    onOrganizeTextToggle={handleOrganizeTextToggle}
                    isOrganizing={isProcessing}
                    hasUnsavedChanges={activeTabObject.isDirty}
                    onAiOrganizeComplete={aiOrganizeCompleted}
                    isZenMode={isZenMode}
                    showLineNumbers={showLineNumbers}
                    toggleZenMode={toggleZenMode}
                    toggleFormattingToolbar={toggleFormattingToolbar}
                    toggleShowLineNumbers={toggleShowLineNumbers}
                  />
                )}
                
                <div style={{ flexGrow: 1, height: '100%' }}>
                  {activeTabObject.id?.toLowerCase().endsWith('.md') && showMarkdownPreview ? (
                    <MarkdownPreview 
                      content={activeTabObject.content} 
                      presentationFontSize={presentationFontSize}
                    />
                  ) : (
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
                    />
                  )}
                </div>
              </>
            )}
            
            {((activeTabObject.type === 'file' && activeTabObject.content === undefined) || (activeTabObject.type === 'image' && activeTabObject.imageUrl === undefined)) && !isLoadingFileContent && !fileError && (<div style={{ padding: '15px', color: '#a0aec0', textAlign: 'center' }}>{HEBREW_TEXT.loading} תוכן עבור {activeTabObject.name}...</div>) }
          </div>
        )}
        {mainViewMode === 'editor' && !activeTabObject && !isLoadingFileContent && !fileError && ( <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#718096', /* fontSize removed */ }}><p>פתח קובץ או בחר כלי עזר.</p></div> )}

        {mainViewMode === 'flashcards' && ( <FlashcardView cards={flashcardData} isLoading={isLoadingFlashcards} error={flashcardError} onClose={() => setMainViewMode('editor')} onRetry={generateFlashcards} /> )}
        {mainViewMode === 'summary' && ( <SummaryView initialSummary={summaryText} isLoading={isLoadingAiSummary} error={aiSummaryError} onSave={saveSummary} onDiscard={discardSummary} onRedo={generateSummary} onCloseEditor={() => setMainViewMode('editor')} /> )}
        {mainViewMode === 'sourceResults' && ( <SourceResultsDisplay resultsText={sourceFindingResults} isLoading={isLoadingSourceFinding} error={sourceFindingError} onSave={saveSourceFindingResults} onDiscard={discardSourceFindingResults} onRedo={findJewishSources} onCloseEditor={() => setMainViewMode('editor')} /> )}
        
        {mainViewMode === 'search' && renderSearchResultsV2()}

        {mainViewMode === 'recent' && ( <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}> <h2 style={{ margin: 0, color: '#e5e7eb' }}>{HEBREW_TEXT.recentFiles}</h2> {workspaceFolders.length > 0 && <button onClick={fetchStatsFiles} disabled={isLoadingStats || !!globalLoadingMessage} className="btn btn-secondary btn-sm">רענן</button>} </div> {renderStatsList(HEBREW_TEXT.recentFiles, recentFiles, isLoadingStats, statsViewErrorProp)} </div> )}
        {mainViewMode === 'frequent' && ( <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}> <h2 style={{ margin: 0, color: '#e5e7eb' }}>{HEBREW_TEXT.frequentFiles}</h2> {workspaceFolders.length > 0 && <button onClick={fetchStatsFiles} disabled={isLoadingStats || !!globalLoadingMessage} className="btn btn-secondary btn-sm">רענן</button>} </div> {renderStatsList(HEBREW_TEXT.frequentFiles, frequentFiles, isLoadingStats, statsViewErrorProp)} </div> )}

        {mainViewMode === 'repetitions' && repetitionsHook && ( <RepetitionListView repetitionsHook={repetitionsHook} onClose={onCloseRepetitionView} /> )}

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
            <div style={{padding: '20px'}}>
                <h3>{HEBREW_TEXT.questionnaire.dailyAnswersTitle(questionnaireHook.currentWeeklyAnswersRange.startDate)}</h3>
                {/* Render detailed answers here */}
                {questionnaireHook.detailedWeeklyAnswers.map(ans => (
                    <div key={ans.date} style={{borderBottom: '1px solid #ccc', marginBottom: '10px', paddingBottom: '10px'}}>
                        <strong>{new Date(ans.date + "T00:00:00").toLocaleDateString('he-IL')}</strong>: Rating {ans.rating_today || 'N/A'}, Details: {ans.details_today || 'N/A'}
                    </div>
                ))}
                <button onClick={() => setMainViewMode('weeklySummary')}>
                    {HEBREW_TEXT.questionnaire.backToSummary}
                </button>
            </div>
        )}


      </div>
      
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

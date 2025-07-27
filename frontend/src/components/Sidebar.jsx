// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react'; // Added useState for API key input
import TreeItem from './TreeItem';
import path from '../utils/pathUtils';
import { APP_DIRECTION, SUPPORTED_IMAGE_EXTENSIONS_CLIENT, HEBREW_TEXT } from '../utils/constants';

const Sidebar = ({
  workspaceFolders,
  folderPathInput,
  setFolderPathInput,
  handleAddFolder,
  isAddingFolder,
  addFolderError,
  mainViewMode,
  handleToggleMainView,
  handleFileSelect,
  // Search related props (updated for V2)
  searchTerm,
  setSearchTerm,
  searchInputRef,
  handleSearch, // This will be handleSearchV2 from the hook
  isSearching,
  searchError,
  // setSearchError, // No longer directly setting from here, hook manages it
  // searchResults, // Search results are displayed in MainContentArea
  // setSearchResults, // Hook manages it
  currentSearchScope,
  // setCurrentSearchScope, // Hook manages it via handleSetSearchScopeAndTriggerSearch & clearSearchScope
  handleSetSearchScopeAndTriggerSearch,
  // New V2 props - for now, only searchTerm and handleSearch are directly used in Sidebar for triggering.
  // Options UI will be added in a later phase.
  // searchOptions,
  // setSearchOptions,
  // includePatterns,
  // setIncludePatterns,
  // excludePatterns,
  // setExcludePatterns,
  
  // Stats related props
  recentFiles,
  frequentFiles,
  isLoadingStats,
  statsError,
  fetchStatsFiles,
  // Context Menu and Explorer Ops
  onContextMenuRequest,
  startRenameInExplorerUI,
  clearRenameFlagInExplorerUI,
  renameItemInExplorer,
  dropItemInExplorer,
  createNewFileFromExplorer,
  createNewFolderFromExplorer,
  deleteItemFromExplorer,
  setContextMenuState,
  globalLoadingMessage,
  handleRemoveWorkspaceFolder,
  onOpenJudaismChat,
  className, // Added className prop
  // Add props for API key handling later
  // initialGeminiApiKey,
  // onSaveGeminiApiKey,
}) => {

  // State for Gemini API Key Input (basic implementation)
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(''); // Add initialGeminiApiKey prop later

  const handleAddFolderButtonClick = () => {
    handleAddFolder(folderPathInput, false);
  };

  const handleSaveApiKey = () => {
    // Placeholder: Implement saving logic using onSaveGeminiApiKey prop later
    console.log("Saving API Key:", geminiApiKeyInput);
    // Example: onSaveGeminiApiKey(geminiApiKeyInput);
    alert('API Key saving not implemented yet.'); // Temporary feedback
  };

  // Simplified Search Input Section for Sidebar (actual results in MainContentArea)
  // Advanced options (regex, case, etc.) will be added in the Search View in MainContentArea
  // or a dedicated search panel if that's the design for Phase 4.
  // For now, Sidebar just has the input and triggers the global search view.
  const renderSearchInput = () => (
    <div style={{ padding: '10px 15px', borderBottom: `1px solid var(--theme-border-color)`, textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left' }}>
      {/* --- Font size reduced --- */}
      <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.0rem', color: `var(--theme-text-primary)` }}>{HEBREW_TEXT.search}</h3>
      <input
        ref={searchInputRef}
        type="text"
        placeholder={HEBREW_TEXT.searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleToggleMainView('search'); // Ensure search view is active
            handleSearch(); // Trigger the search
          }
        }}
        style={{ width: 'calc(100% - 22px)', /* fontSize removed */ padding: '6px 10px', marginBottom: '5px' }}
      />
      {/* Search button is implicit via Enter key or handled in MainContentArea's search view */}
      {isSearching && <p style={{color: '#a0aec0', /* fontSize removed */ margin: '5px 0 0 0'}}>{HEBREW_TEXT.searching}</p>}
      {/* Brief error related to input can be shown here, detailed errors in MainContentArea */}
      {searchError && searchTerm.length > 0 && !isSearching && (searchResults === 0 || !searchResults) && <p style={{color: '#fc8181', /* fontSize removed */ margin: '5px 0 0 0'}}>{searchError}</p>}
    </div>
  );
  
  const renderStatsList = (title, files, isLoading, error) => {
    if (workspaceFolders.length === 0 && !isLoading) return <p style={{/* fontSize removed */ color: '#a0aec0', padding: '5px 0'}}>הוסף תיקייה כדי לראות {title.toLowerCase()}.</p>;
    if (isLoading) return <p style={{/* fontSize removed */ padding: '5px 0', color: '#a0aec0'}}>טוען {title.toLowerCase()}...</p>;
    if (error && files.length ===0) return <p style={{ color: '#fc8181', /* fontSize removed */ padding: '5px 0' }}>שגיאה: {error}</p>;
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
          const rootName = file.rootName || (file.base_folder_path ? path.basename(file.base_folder_path) : HEBREW_TEXT.unknownFolder);
          const targetFolder = { path: file.base_folder_path || file.basePath, name: rootName };
          
          // Create a unique key using absolute_file_path if available, otherwise use index
          const uniqueKey = file.absolute_file_path || `${file.base_folder_path || file.basePath}::${file.path}::${index}`;
          
          return (
            <div
              key={uniqueKey}
              onClick={() => handleFileSelect(targetFolder, { name: file.file_name, path: file.path, type: itemType })}
              style={{ padding: '6px 12px', cursor: 'pointer', color: '#cbd5e0', borderRadius: '3px', transition: 'background-color 0.1s ease-in-out', borderBottom: '1px solid #2d3748' }}
              title={`פתח את ${file.file_name || 'שם לא ידוע'} (${rootName}/${file.path})\nנפתח לאחרונה: ${file.last_opened_or_edited ? new Date(file.last_opened_or_edited * 1000).toLocaleString() : 'N/A'}\nמספר פתיחות: ${file.access_count !== undefined ? file.access_count : 'N/A'}`}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{fontWeight: 'bold'}}>{rootName}</span> / {file.file_name || file.path}
              {file.file_name && <span style={{/* fontSize removed */ color: '#718096', marginLeft: '5px'}}>({file.path})</span>}
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <div className={className} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100vh' /* Ensure sidebar takes full height */ }}>
      {/* Explorer Section */}
      <div style={{ padding: '12px 15px', borderBottom: `1px solid var(--theme-border-color)`, flexShrink: 0, textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left' }}>
        {/* --- Font size reduced --- */}
        <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.1rem', color: `var(--theme-text-primary)` }}>{HEBREW_TEXT.explorer}</h2>
        {workspaceFolders.length === 0 && !isAddingFolder && !addFolderError && <p style={{ /* fontSize removed */ color: '#718096' }}>{HEBREW_TEXT.addFolderToStart}</p>}
        
        <div style={{display: 'flex', gap: '5px', marginTop: '5px', marginBottom: '10px'}}>
            <input type="text" value={folderPathInput} onChange={(e) => setFolderPathInput(e.target.value)} placeholder={HEBREW_TEXT.enterFolderPath} style={{ flexGrow:1, /* fontSize removed */ }} onKeyPress={(e) => e.key === 'Enter' && handleAddFolderButtonClick()} />
            <button onClick={handleAddFolderButtonClick} disabled={isAddingFolder || !!globalLoadingMessage} title={HEBREW_TEXT.addFolder} className="btn btn-success btn-sm">{isAddingFolder ? '...' : '+'}</button> {/* Replaced style with btn classes */}
        </div>
        {addFolderError && <span style={{ color: '#fc8181', /* fontSize removed */ }}>{HEBREW_TEXT.error}: {addFolderError}</span>}
      </div>

      {/* File Tree Section */}
      <div style={{ overflowY: 'auto', flexGrow: 1, padding: '5px 0', textAlign: 'left' }}>
        {workspaceFolders.map(wf => (
          <div key={wf.id || wf.path}>
            <div
              style={{ padding: '8px 10px', backgroundColor: '#2d3748', color: '#e2e8f0', fontWeight: 'bold', borderBottom: '1px solid #1a1d21', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onContextMenu={(e) => {
                e.preventDefault(); e.stopPropagation();
                const rootItems = [
                  { label: HEBREW_TEXT.newFile + "...", action: () => createNewFileFromExplorer(null, wf) },
                  { label: HEBREW_TEXT.newFolder + "...", action: () => createNewFolderFromExplorer(null, wf) },
                ];
                if (wf.path) { 
                  rootItems.push({ type: 'separator' });
                  // Updated to use handleSetSearchScopeAndTriggerSearch
                  rootItems.push({ label: HEBREW_TEXT.searchInThisFolder, action: () => handleSetSearchScopeAndTriggerSearch(wf, '', wf.name) });
                  rootItems.push({ type: 'separator' });
                  rootItems.push({ 
                    label: HEBREW_TEXT.removeFolderFromWorkspace, 
                    action: () => {
                        if (window.confirm(HEBREW_TEXT.confirmRemoveFolder(wf.name))) {
                            handleRemoveWorkspaceFolder(wf.path);
                        }
                    }
                  });
                }
                setContextMenuState({ visible: true, x: e.clientX, y: e.clientY, items: rootItems, item: null, baseFolder: wf });
              }}
            >
              <span>{wf.name}</span>
            </div>
            {wf.isLoading && <p style={{ /* fontSize removed */ color: '#a0aec0', padding: '5px 10px' }}>{HEBREW_TEXT.loadingFolder}...</p>}
            {wf.error && <p style={{ /* fontSize removed */ color: '#fca5a5', padding: '5px 10px' }}>{wf.error}</p>}
            {wf.structure && wf.structure.map(item => (
              <TreeItem
                key={item.path}
                item={item}
                onItemClick={(fileItem) => handleFileSelect(wf, fileItem)}
                // Updated to use handleSetSearchScopeAndTriggerSearch
                onSetSearchScope={(itemPath, itemName) => handleSetSearchScopeAndTriggerSearch(wf, itemPath, itemName)}
                level={0}
                baseFolder={wf}
                onContextMenuRequest={onContextMenuRequest}
                onRename={(itemBeingRenamed, newName) => renameItemInExplorer(itemBeingRenamed, newName, wf)}
                onRenameTriggered={(itemThatWasTriggered) => clearRenameFlagInExplorerUI(itemThatWasTriggered, wf)} 
                startRenameInExplorerUI = {() => startRenameInExplorerUI(item, wf)} 
                onDropItemOntoFolder={dropItemInExplorer}
                deleteItemFromExplorer={deleteItemFromExplorer}
                createNewFileFromExplorer={createNewFileFromExplorer}
                createNewFolderFromExplorer={createNewFolderFromExplorer}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Search Input Section - Moved here as a distinct block */}
      {renderSearchInput()}

      {/* View Toggle Buttons Section */}
      <div style={{ padding: '10px 15px', borderTop: `1px solid var(--theme-border-color)`, flexShrink: 0, textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* --- Moved Judaism Chat Button Here --- */}
        <button
            onClick={onOpenJudaismChat}
            disabled={!!globalLoadingMessage}
            title={HEBREW_TEXT.judaismChat.chatButtonText}
            style={{
                padding: '8px 12px',
                width: '100%',
                textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left',
                // --- Changed Style to match inactive buttons ---
                backgroundColor: 'var(--theme-bg-secondary)',
                color: 'var(--theme-text-primary)',
                border: `1px solid var(--theme-border-color)`,
                borderRadius: '4px',
                opacity: globalLoadingMessage ? 0.6 : 1
            }}
        >
            {HEBREW_TEXT.judaismChat.chatButtonText || "צ'אט הלכה ויהדות"}
        </button>
        {/* --- End Moved Button --- */}
        <button
            onClick={() => handleToggleMainView('search')}
            style={{
                padding: '8px 12px',
                width: '100%',
                textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left',
                backgroundColor: mainViewMode === 'search' ? 'var(--theme-accent-primary)' : 'var(--theme-bg-secondary)',
                color: mainViewMode === 'search' ? 'var(--theme-button-text-color)' : 'var(--theme-text-primary)',
                border: `1px solid ${mainViewMode === 'search' ? 'var(--theme-accent-primary)' : 'var(--theme-border-color)'}`,
                borderRadius: '4px'
            }}
        >
            {HEBREW_TEXT.searchFiles}
        </button>
        <button onClick={() => handleToggleMainView('recent')} style={{ padding: '8px 12px', width: '100%', textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left', backgroundColor: mainViewMode === 'recent' ? 'var(--theme-accent-primary)' : 'var(--theme-bg-secondary)', color: mainViewMode === 'recent' ? 'var(--theme-button-text-color)' : 'var(--theme-text-primary)', border: `1px solid ${mainViewMode === 'recent' ? 'var(--theme-accent-primary)' : 'var(--theme-border-color)'}`, borderRadius: '4px' }}>{HEBREW_TEXT.recentFiles}</button>
        <button onClick={() => handleToggleMainView('frequent')} style={{ padding: '8px 12px', width: '100%', textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left', backgroundColor: mainViewMode === 'frequent' ? 'var(--theme-accent-primary)' : 'var(--theme-bg-secondary)', color: mainViewMode === 'frequent' ? 'var(--theme-button-text-color)' : 'var(--theme-text-primary)', border: `1px solid ${mainViewMode === 'frequent' ? 'var(--theme-accent-primary)' : 'var(--theme-border-color)'}`, borderRadius: '4px' }}>{HEBREW_TEXT.frequentFiles}</button>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--theme-text-secondary)', marginTop: '5px' }}>
          Developed by Gemini
        </div>
      </div>

      {/* --- New Gemini API Key Section --- */}
      <div style={{ padding: '10px 15px', borderTop: `1px solid var(--theme-border-color)`, flexShrink: 0, textAlign: APP_DIRECTION === 'rtl' ? 'right' : 'left' }}>
        <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '0.9rem', color: `var(--theme-text-primary)` }}>{HEBREW_TEXT.geminiApiKey || ''}</h4>
        <input
          type="password" // Use password type to obscure the key
          placeholder={HEBREW_TEXT.enterGeminiApiKey || 'הזן מפתח Gemini API'}
          value={geminiApiKeyInput}
          onChange={(e) => setGeminiApiKeyInput(e.target.value)}
          style={{ width: 'calc(100% - 22px)', fontSize: '0.9rem', padding: '6px 10px', marginBottom: '5px', backgroundColor: 'var(--theme-input-bg)', color: 'var(--theme-input-text)', border: '1px solid var(--theme-border-color)' }}
        />
        <button
          onClick={handleSaveApiKey}
          style={{
            padding: '6px 10px',
            fontSize: '0.9rem',
            backgroundColor: 'var(--theme-accent-secondary)',
            color: 'var(--theme-button-text-color)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '5px'
          }}
        >
          {HEBREW_TEXT.saveApiKey || 'שמור מפתח'}
        </button>
        {/* Add feedback message area if needed */}
      </div>
      {/* --- End New Section --- */}

    </div>
  );
};

export default Sidebar;

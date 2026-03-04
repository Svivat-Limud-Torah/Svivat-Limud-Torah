// frontend/src/components/Sidebar.jsx
import React from 'react';
import TreeItem from './TreeItem';
import { APP_DIRECTION, HEBREW_TEXT, IS_WEB_MODE } from '../utils/constants';
import LocalFileSystemService from '../services/LocalFileSystemService';

const Sidebar = ({
  workspaceFolders,
  handleAddFolder,
  isAddingFolder,
  addFolderError,
  mainViewMode,
  handleToggleMainView,
  handleFileSelect,
  searchTerm,
  setSearchTerm,
  searchInputRef,
  handleSearch,
  isSearching,
  searchError,
  handleSetSearchScopeAndTriggerSearch,
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
  onOpenImportExport,
  pendingFolders = [],
  restoringPendingFolder = null,
  onRestorePendingFolder,
  className,
  style,
}) => {
  const isRtl = APP_DIRECTION === 'rtl';

  const handleAddFolderButtonClick = async () => {
    // Browser will show folder picker dialog - this is required for web security
    await handleAddFolder(null, false);
  };

  const renderSearchInput = () => (
    <div
      style={{
        padding: '8px 12px 10px',
        borderTop: '1px solid var(--theme-border-color)',
        textAlign: isRtl ? 'right' : 'left',
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: '6px',
          fontSize: '0.98rem',
          color: 'var(--theme-text-primary)',
        }}
      >
        {HEBREW_TEXT.search}
      </h3>
      <input
        ref={searchInputRef}
        type="text"
        placeholder={HEBREW_TEXT.searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (mainViewMode !== 'search') {
              handleToggleMainView('search');
            }
            handleSearch();
          }
        }}
        style={{ width: '100%', padding: '7px 10px', marginBottom: '3px' }}
      />
      {isSearching && (
        <p style={{ color: 'var(--theme-text-secondary)', margin: '5px 0 0 0' }}>
          {HEBREW_TEXT.searching}
        </p>
      )}
      {searchError && searchTerm.length > 0 && !isSearching && (
        <p style={{ color: 'var(--theme-error-color)', margin: '5px 0 0 0' }}>{searchError}</p>
      )}
    </div>
  );

  return (
    <div
      className={className}
      dir={APP_DIRECTION}
      style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', ...style }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--theme-border-color)',
          flexShrink: 0,
          textAlign: isRtl ? 'right' : 'left',
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: '8px',
            fontSize: '1.1rem',
            color: 'var(--theme-text-primary)',
          }}
        >
          {HEBREW_TEXT.explorer}
        </h2>

        {workspaceFolders.length === 0 && !isAddingFolder && !addFolderError && (
          <p style={{ color: 'var(--theme-text-tertiary)' }}>לחץ על הכפתור למטה כדי לבחור תיקייה מהמחשב שלך</p>
        )}

        {/* Permission re-grant banner for folders saved from a previous session */}
        {pendingFolders.length > 0 && (
          <div style={{
            margin: '6px 0',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(251,191,36,0.4)',
            backgroundColor: 'rgba(251,191,36,0.08)',
            fontSize: '0.82rem',
            lineHeight: 1.5,
          }}>
            <p style={{ margin: '0 0 8px', color: 'var(--theme-text-secondary)', fontWeight: 600 }}>
              התיקיות הבאות דורשות אישור מחדש:
            </p>
            {pendingFolders.map(name => (
              <button
                key={name}
                className="btn btn-secondary"
                onClick={() => onRestorePendingFolder?.(name)}
                disabled={restoringPendingFolder === name}
                style={{ width: '100%', marginBottom: 4, fontSize: '0.82rem', textAlign: 'right' }}
              >
                {restoringPendingFolder === name ? 'בודק...' : `אשר גישה: "‏${name}‏"`}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '5px', marginTop: '5px', marginBottom: '2px' }}>
          <button
            onClick={handleAddFolderButtonClick}
            disabled={isAddingFolder || !!globalLoadingMessage}
            title="בחר תיקייה מהמחשב"
            className="btn btn-success"
            data-tutorial="add-folder-button"
            style={{ width: '100%', padding: '8px 10px' }}
          >
            {isAddingFolder ? 'פותח תיקייה...' : 'בחר תיקייה מהמחשב'}
          </button>
        </div>

        {addFolderError && (
          <span style={{ color: 'var(--theme-error-color)' }}>
            {HEBREW_TEXT.error}: {addFolderError}
          </span>
        )}
      </div>

      <div
        className="sidebar-tree-scroll"
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          flexGrow: 1,
          minHeight: 0,
          padding: '8px 0',
          direction: 'ltr',
        }}
      >
        {workspaceFolders.map((wf) => (
          <div
            key={wf.id || wf.path}
            dir={APP_DIRECTION}
            style={{ direction: APP_DIRECTION, textAlign: isRtl ? 'right' : 'left' }}
          >
            <div
              className="sidebar-workspace-root"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const rootItems = [
                  { label: `${HEBREW_TEXT.newFile}...`, action: () => createNewFileFromExplorer(null, wf) },
                  {
                    label: `${HEBREW_TEXT.newFolder}...`,
                    action: () => createNewFolderFromExplorer(null, wf),
                  },
                ];

                if (wf.path) {
                  rootItems.push({ type: 'separator' });
                  rootItems.push({
                    label: HEBREW_TEXT.searchInThisFolder,
                    action: () => handleSetSearchScopeAndTriggerSearch(wf, '', wf.name),
                  });
                  rootItems.push({ type: 'separator' });
                  rootItems.push({
                    label: HEBREW_TEXT.removeFolderFromWorkspace,
                    action: () => {
                      if (window.confirm(HEBREW_TEXT.confirmRemoveFolder(wf.name))) {
                        handleRemoveWorkspaceFolder(wf.path);
                      }
                    },
                  });

                  if (IS_WEB_MODE) {
                    rootItems.push({ type: 'separator' });
                    rootItems.push({
                      label: 'הורד תיקייה למחשב',
                      action: async () => {
                        try {
                          const parentHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
                          const srcHandle = LocalFileSystemService.directoryHandles.get(wf.path);
                          if (!srcHandle) throw new Error('לא נמצא handle לתיקייה');
                          const sanitizeName = (name) => name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || '_file';
                          const destFolder = await parentHandle.getDirectoryHandle(sanitizeName(wf.name), { create: true });
                          const copyDir = async (src, dest) => {
                            for await (const entry of src.values()) {
                              const safeName = sanitizeName(entry.name);
                              if (entry.kind === 'file') {
                                const file = await entry.getFile();
                                const destFile = await dest.getFileHandle(safeName, { create: true });
                                const writable = await destFile.createWritable();
                                await writable.write(await file.arrayBuffer());
                                await writable.close();
                              } else if (entry.kind === 'directory') {
                                const subDest = await dest.getDirectoryHandle(safeName, { create: true });
                                await copyDir(entry, subDest);
                              }
                            }
                          };
                          await copyDir(srcHandle, destFolder);
                          alert('התיקייה הורדה בהצלחה למחשב!');
                        } catch (err) {
                          if (err.name !== 'AbortError') {
                            console.error('Download folder error:', err);
                            alert('שגיאה בהורדת התיקייה: ' + (err.message || err));
                          }
                        }
                      },
                    });
                  }
                }

                setContextMenuState({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  items: rootItems,
                  item: null,
                  baseFolder: wf,
                });
              }}
            >
              <span className="sidebar-workspace-root-label">{wf.name}</span>
            </div>

            {wf.isLoading && (
              <p style={{ color: 'var(--theme-text-secondary)', padding: '5px 10px' }}>
                {HEBREW_TEXT.loadingFolder}...
              </p>
            )}
            {wf.error && <p style={{ color: 'var(--theme-error-text)', padding: '5px 10px' }}>{wf.error}</p>}

            {wf.structure &&
              wf.structure.map((item) => (
                <TreeItem
                  key={item.path}
                  item={item}
                  onItemClick={(fileItem) => handleFileSelect(wf, fileItem)}
                  onSetSearchScope={(itemPath, itemName) =>
                    handleSetSearchScopeAndTriggerSearch(wf, itemPath, itemName)
                  }
                  level={0}
                  baseFolder={wf}
                  onContextMenuRequest={onContextMenuRequest}
                  onRename={(itemBeingRenamed, newName) =>
                    renameItemInExplorer(itemBeingRenamed, newName, wf)
                  }
                  onRenameTriggered={(itemThatWasTriggered) =>
                    clearRenameFlagInExplorerUI(itemThatWasTriggered, wf)
                  }
                  startRenameInExplorerUI={() => startRenameInExplorerUI(item, wf)}
                  onDropItemOntoFolder={dropItemInExplorer}
                  deleteItemFromExplorer={deleteItemFromExplorer}
                  createNewFileFromExplorer={createNewFileFromExplorer}
                  createNewFolderFromExplorer={createNewFolderFromExplorer}
                />
              ))}
          </div>
        ))}
      </div>

      {renderSearchInput()}

      <div
        className="sidebar-actions"
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--theme-border-color)',
          flexShrink: 0,
          textAlign: isRtl ? 'right' : 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <button
          onClick={onOpenJudaismChat}
          disabled={!!globalLoadingMessage}
          title={HEBREW_TEXT.judaismChat.chatButtonText}
          className="btn sidebar-action-btn"
          style={{ opacity: globalLoadingMessage ? 0.6 : 1 }}
        >
          {HEBREW_TEXT.judaismChat.chatButtonText || "צ'אט הלכה ויהדות"}
        </button>

        <button
          onClick={() => handleToggleMainView('snapshot')}
          className={`btn sidebar-action-btn ${mainViewMode === 'snapshot' ? 'is-active' : ''}`.trim()}
        >
          {HEBREW_TEXT.userSnapshot}
        </button>

        <button
          onClick={onOpenImportExport}
          className="btn sidebar-action-btn"
        >
          יצוא / יבוא
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

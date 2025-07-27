// frontend/src/components/TreeItem.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
    FaFolder, FaFolderOpen, FaFileAlt, FaImage, FaChevronRight, FaChevronDown, FaSearch,
    FaFileCode, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive,
    FaFileAudio, FaFileVideo, FaHtml5, FaCss3Alt, FaJsSquare, FaPython, FaJava, FaMarkdown, FaDatabase
} from 'react-icons/fa';
import { DiJavascript1, DiCss3, DiHtml5, DiPython, DiJava, DiMarkdown } from 'react-icons/di'; // DevIcons
import './TreeItem.css'; // Assuming you might add specific styles

const TreeItem = ({
    item, 
    onItemClick, 
    level, 
    onSetSearchScope, 
    baseFolder,
    onContextMenuRequest,
    onRename, 
    onRenameTriggered, // To clear the renaming flag in App.jsx
    onDragStartItem,
    onDropItemOntoFolder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.name);
  const renameInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);


  const toggleOpen = (e) => {
    e.stopPropagation();
    if (item.isFolder) {
      setIsOpen(!isOpen);
    }
  };

  const handleItemClick = (e) => {
    e.stopPropagation();
    if (item.isFolder) {
      toggleOpen(e); 
    } else {
      onItemClick(item);
    }
  };

  const handleSearchClick = (e) => {
    e.stopPropagation();
    // Pass item.path (relative to baseFolder) and item.name. Type can be inferred or passed.
    onSetSearchScope(item.path, item.name); 
  };
  
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenuRequest) {
      onContextMenuRequest(e, item, baseFolder);
    }
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    const trimmedNewName = renameValue.trim();
    if (trimmedNewName && trimmedNewName !== item.name) {
      if (onRename) {
        onRename(item, trimmedNewName); // Pass item and newName to App.jsx
      }
    }
    setIsRenaming(false);
  };

  const handleRenameBlur = () => {
    const trimmedNewName = renameValue.trim();
    if (trimmedNewName && trimmedNewName !== item.name) { // Only submit if actual change
         if (onRename) {
            onRename(item, trimmedNewName);
        }
    }
    setIsRenaming(false);
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);
  
  useEffect(() => {
    if (item.startRenaming) { 
        setIsRenaming(true);
        setRenameValue(item.name);
        if (onRenameTriggered) { // Notify parent to clear the trigger
            onRenameTriggered(item); 
        }
    }
  }, [item.startRenaming, item.name, onRenameTriggered, item]);


  const handleDragStart = (e) => {
    // e.stopPropagation(); // Not strictly needed here if draggable is on the outer div
    if (onDragStartItem) { // This prop might not be used if App.jsx doesn't need to know
        onDragStartItem(e, item, baseFolder);
    }
    // Data for internal (App.jsx) and potentially external drops
    const dragData = {
        itemPath: item.path,
        itemName: item.name,
        itemType: item.type,
        isFolder: item.isFolder,
        sourceBaseFolderPath: baseFolder.path,
        sourceBaseFolderName: baseFolder.name
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', `${baseFolder.path}::${item.path}`); // Fallback
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (item.isFolder) { // Can only drop onto folders
        const draggedItemDataString = e.dataTransfer.getData('application/json');
        if (draggedItemDataString) {
            const draggedItemData = JSON.parse(draggedItemDataString);
            // Prevent dropping onto self or parent dropping into child
            const dragSourceFullPath = path.join(draggedItemData.sourceBaseFolderPath, draggedItemData.itemPath);
            const dropTargetFullPath = path.join(baseFolder.path, item.path);

            if (dragSourceFullPath === dropTargetFullPath || // Cannot drop onto self
                (draggedItemData.isFolder && dropTargetFullPath.startsWith(dragSourceFullPath + (dragSourceFullPath.endsWith('/') ? '' : '/'))) // Cannot drop parent folder into its child
            ) {
                e.dataTransfer.dropEffect = 'none';
                setIsDragOver(false);
                return;
            }
        }
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    } else {
        e.dataTransfer.dropEffect = 'none';
        setIsDragOver(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.isFolder) {
        const draggedItemDataString = e.dataTransfer.getData('application/json');
        if (draggedItemDataString) {
            const draggedItemData = JSON.parse(draggedItemDataString);
            const dragSourceFullPath = path.join(draggedItemData.sourceBaseFolderPath, draggedItemData.itemPath);
            const dropTargetFullPath = path.join(baseFolder.path, item.path);
            if (dragSourceFullPath === dropTargetFullPath || (draggedItemData.isFolder && dropTargetFullPath.startsWith(dragSourceFullPath + '/'))) {
                return;
            }
        }
       setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (item.isFolder && onDropItemOntoFolder) {
        try {
            const draggedItemDataString = e.dataTransfer.getData('application/json');
            if (!draggedItemDataString) return; // No valid data
            const draggedItemData = JSON.parse(draggedItemDataString);

            // Final check before calling handler (redundant if DragOver is perfect, but good for safety)
            const dragSourceFullPath = path.join(draggedItemData.sourceBaseFolderPath, draggedItemData.itemPath);
            const dropTargetFullPath = path.join(baseFolder.path, item.path);
             if (dragSourceFullPath === dropTargetFullPath || 
                (draggedItemData.isFolder && dropTargetFullPath.startsWith(dragSourceFullPath + (dragSourceFullPath.endsWith('/') ? '' : '/')))) {
                console.warn("Drop rejected due to self/child drop condition.");
                return;
            }
            
            onDropItemOntoFolder(draggedItemData, item, baseFolder); // targetFolderItem is 'item', targetBaseFolder is 'baseFolder'
        } catch (error) {
            console.error("Error processing drop data:", error);
        }
    }
  };


  let IconComponent;
  const extension = item.name && !item.isFolder ? item.name.slice(item.name.lastIndexOf('.')).toLowerCase() : '';

  if (item.isFolder) {
    IconComponent = isOpen ? FaFolderOpen : FaFolder;
  } else if (item.type === 'image') { // Assuming item.type is correctly set for images
    IconComponent = FaImage;
  } else {
    switch (extension) {
      case '.js':
      case '.jsx':
        IconComponent = DiJavascript1; // Or FaJsSquare
        break;
      case '.ts':
      case '.tsx':
        IconComponent = DiJavascript1; // Placeholder, consider SiTypescript or similar if adding more icon sets
        break;
      case '.css':
        IconComponent = DiCss3; // Or FaCss3Alt
        break;
      case '.scss':
      case '.sass':
        IconComponent = FaCss3Alt; // FaSass could be an option
        break;
      case '.html':
        IconComponent = DiHtml5; // Or FaHtml5
        break;
      case '.py':
        IconComponent = DiPython; // Or FaPython
        break;
      case '.java':
        IconComponent = DiJava; // Or FaJava
        break;
      case '.md':
        IconComponent = DiMarkdown; // Or FaMarkdown
        break;
      case '.json':
      case '.xml':
      case '.yaml':
      case '.yml':
        IconComponent = FaFileCode;
        break;
      case '.pdf':
        IconComponent = FaFilePdf;
        break;
      case '.doc':
      case '.docx':
        IconComponent = FaFileWord;
        break;
      case '.xls':
      case '.xlsx':
      case '.csv':
        IconComponent = FaFileExcel;
        break;
      case '.ppt':
      case '.pptx':
        IconComponent = FaFilePowerpoint;
        break;
      case '.zip':
      case '.rar':
      case '.tar':
      case '.gz':
        IconComponent = FaFileArchive;
        break;
      case '.mp3':
      case '.wav':
        IconComponent = FaFileAudio;
        break;
      case '.mp4':
      case '.mov':
      case '.avi':
      case '.mkv':
        IconComponent = FaFileVideo;
        break;
      case '.txt':
      case '.log':
        IconComponent = FaFileAlt; // Default text file
        break;
      case '.sqlite':
      case '.db':
        IconComponent = FaDatabase;
        break;
      default:
        IconComponent = FaFileAlt; // Default for other files
    }
  }

  const paddingLeft = level * 18 + (item.isFolder || !item.children || item.children.length === 0 ? 0 : 0);

  // The path module for client-side path manipulation (simple version)
  const path = {
    join: (...args) => {
        const parts = args.filter(arg => typeof arg === 'string' && arg !== '');
        const joined = parts.join('/').replace(/\\/g, '/');
        return joined.replace(/\/+/g, '/');
    }
  };

  return (
    <div>
      <div
        className={`tree-item ${item.isFolder ? 'tree-folder' : 'tree-file'} ${isDragOver ? 'drag-over-folder' : ''}`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={!isRenaming ? handleItemClick : undefined} // Prevent click if renaming
        onContextMenu={!isRenaming ? handleContextMenu : undefined}
        draggable={!isRenaming} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver} 
        onDrop={handleDrop}        
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {item.isFolder && (
          <span className="tree-item-toggle-icon" onClick={toggleOpen} style={{ paddingLeft: level === 0 && (!item.children || item.children.length === 0) ? '10px' : '0' }}>
            {item.children && item.children.length > 0 ? (isOpen ? <FaChevronDown /> : <FaChevronRight />) : <span style={{display: 'inline-block', width: '1em'}}></span>}
          </span>
        )}
        <IconComponent className="tree-item-icon" />
        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} style={{ flexGrow: 1, display: 'flex' }}>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameBlur}
              onClick={(e) => e.stopPropagation()} 
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setIsRenaming(false);
                  setRenameValue(item.name); 
                } else if (e.key === 'Enter') {
                  e.stopPropagation(); // Prevent default form submission if any higher up
                  handleRenameSubmit(e);
                }
              }}
              className="tree-item-rename-input"
            />
          </form>
        ) : (
          <span className="tree-item-name">{item.name}</span>
        )}
        {!isRenaming && item.type !== 'image' && (
          <button
            className="tree-item-search-button"
            onClick={handleSearchClick}
            title={`חפש בתוך ${item.name}`}
          >
            <FaSearch />
          </button>
        )}
      </div>
      {isOpen && item.isFolder && item.children && (
        <div className="tree-item-children">
          {item.children.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              onItemClick={onItemClick}
              level={level + 1}
              onSetSearchScope={onSetSearchScope}
              baseFolder={baseFolder}
              onContextMenuRequest={onContextMenuRequest}
              onRename={onRename}
              onRenameTriggered={onRenameTriggered}
              onDragStartItem={onDragStartItem}
              onDropItemOntoFolder={onDropItemOntoFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeItem;

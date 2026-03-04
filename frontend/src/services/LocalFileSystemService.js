// frontend/src/services/LocalFileSystemService.js
// Local File System Access API Service - Direct file access without uploads!

class LocalFileSystemService {
  constructor() {
    this.directoryHandles = new Map(); // Map of basePath -> directoryHandle
    this.fileHandles = new Map(); // Cache file handles
    this.dbName = 'TorahIDEFileSystem';
    this.storeName = 'directoryHandles';
    this.db = null;
    this.dbReady = this.initDB(); // Store promise so callers can await readiness
  }

  /**
   * Initialize IndexedDB for storing directory handles
   */
  initDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => {
          console.error('IndexedDB error:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'name' });
          }
        };
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        reject(error);
      }
    });
  }

  /**
   * Save directory handle to IndexedDB
   */
  async saveDirectoryHandle(name, handle) {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ name, handle });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load directory handle from IndexedDB
   */
  async loadDirectoryHandle(name) {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(name);
      
      request.onsuccess = () => {
        if (request.result && request.result.handle) {
          resolve(request.result.handle);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all saved folder names
   */
  async getSavedFolderNames() {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove directory handle from IndexedDB
   */
  async removeDirectoryHandle(name) {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(name);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if File System Access API is supported
   */
  isSupported() {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Get directory handle by base path
   * @param {string} basePath - Base path (folder name)
   * @returns {FileSystemDirectoryHandle|null} Directory handle
   */
  getDirectoryHandle(basePath) {
    return this.directoryHandles.get(basePath) || null;
  }

  /**
   * Open a folder picker and get access to a local directory
   * @returns {Promise<Object>} Directory handle and metadata
   */
  async openFolder() {
    try {
      if (!this.isSupported()) {
        throw new Error('File System Access API not supported in this browser. Please use Chrome or Edge.');
      }

      // Show folder picker
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite', // Request read and write permissions
        startIn: 'documents' // Start in Documents folder
      });

      const folderName = directoryHandle.name;
      const folderStructure = await this.scanDirectory(directoryHandle);

      // Store directory handle in memory
      this.directoryHandles.set(folderName, directoryHandle);
      
      // Persist directory handle to IndexedDB
      try {
        await this.saveDirectoryHandle(folderName, directoryHandle);
      } catch (saveError) {
        console.warn('Failed to persist directory handle:', saveError);
      }

      return {
        success: true,
        name: folderName,
        path: folderName,
        structure: folderStructure
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'User cancelled folder selection'
        };
      }
      console.error('Open folder error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Register an existing FileSystemDirectoryHandle directly (no picker).
   * Useful after programmatically creating/writing a directory.
   * @param {FileSystemDirectoryHandle} directoryHandle
   * @returns {Promise<Object>} { success, name, path, structure }
   */
  async registerDirectoryHandle(directoryHandle) {
    try {
      const folderName = directoryHandle.name;
      const folderStructure = await this.scanDirectory(directoryHandle);

      this.directoryHandles.set(folderName, directoryHandle);

      try {
        await this.saveDirectoryHandle(folderName, directoryHandle);
      } catch (saveError) {
        console.warn('Failed to persist directory handle:', saveError);
      }

      return { success: true, name: folderName, path: folderName, structure: folderStructure };
    } catch (error) {
      console.error('registerDirectoryHandle error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recursively scan directory structure
   * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
   * @param {string} path - Current path
   * @returns {Promise<Array>} Array of files and folders
   */
  async scanDirectory(dirHandle, path = '') {
    const items = [];

    try {
      for await (const entry of dirHandle.values()) {
        const itemPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
          // Get file info
          const file = await entry.getFile();
          items.push({
            type: 'file',
            name: entry.name,
            path: itemPath,
            isFolder: false,
            size: file.size,
            lastModified: file.lastModified,
            extension: this.getFileExtension(entry.name)
          });
          
          // Cache file handle
          const cacheKey = `${dirHandle.name}::${itemPath}`;
          this.fileHandles.set(cacheKey, entry);
        } else if (entry.kind === 'directory') {
          // Recursively scan subdirectory
          const children = await this.scanDirectory(entry, itemPath);
          items.push({
            type: 'folder',
            name: entry.name,
            path: itemPath,
            isFolder: true,
            children
          });
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }

    return items;
  }

  /**
   * Read all text files from a workspace folder recursively.
   * Used for smart search — sends file contents to the backend since
   * the File System Access API doesn't expose real filesystem paths.
   * @param {string} folderName - Workspace folder name (key in directoryHandles)
   * @param {number} maxFiles - Maximum number of files to read (default 200)
   * @returns {Promise<Array<{name: string, path: string, content: string}>>}
   */
  async readAllTextFiles(folderName, maxFiles = 200) {
    let directoryHandle = this.directoryHandles.get(folderName);

    // If not in memory, try to restore it from IndexedDB.
    // This handles the case where the page was reloaded — readAllTextFiles is called
    // inside a user-gesture (search button click), so requestPermission is allowed.
    if (!directoryHandle) {
      try {
        const savedHandle = await this.loadDirectoryHandle(folderName);
        if (savedHandle) {
          // requestPermission is legal here because we're inside a user gesture
          const permission = await savedHandle.requestPermission({ mode: 'read' });
          if (permission === 'granted') {
            this.directoryHandles.set(folderName, savedHandle);
            directoryHandle = savedHandle;
          }
        }
      } catch (permError) {
        console.warn('Could not request permission for folder:', folderName, permError);
      }
    }

    if (!directoryHandle) {
      throw new Error(
        'אין גישה לתיקייה "' + folderName + '" — אנא אפשר ניגוש בדפדפן או הוסף את התיקייה מחדש.'
      );
    }

    const TEXT_EXTENSIONS = new Set([
      'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'less',
      'xml', 'yaml', 'yml', 'ini', 'cfg', 'conf', 'log', 'sh', 'bash', 'py', 'rb', 'php',
      'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt', 'kts', 'dart',
      'vue', 'svelte', 'pl', 'pm', 'tcl', 'vb', 'vbs', 'csv', 'tsv', 'rtf', 'tex', 'text',
    ]);

    const EXCLUDE_DIRS = new Set([
      'node_modules', '.git', 'dist', 'build', 'coverage', '.vscode', '.idea',
    ]);

    const files = [];

    const collectFiles = async (dirHandle, currentPath) => {
      if (files.length >= maxFiles) return;
      try {
        for await (const entry of dirHandle.values()) {
          if (files.length >= maxFiles) return;
          const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

          if (entry.kind === 'directory') {
            if (EXCLUDE_DIRS.has(entry.name)) continue;
            try {
              const subDir = await dirHandle.getDirectoryHandle(entry.name);
              await collectFiles(subDir, entryPath);
            } catch { /* skip inaccessible dirs */ }
          } else if (entry.kind === 'file') {
            const ext = entry.name.split('.').pop()?.toLowerCase();
            if (!ext || !TEXT_EXTENSIONS.has(ext)) continue;
            try {
              const file = await entry.getFile();
              if (file.size > 1024 * 1024) continue; // Skip files > 1MB
              const content = await file.text();
              files.push({ name: entry.name, path: entryPath, content });
            } catch { /* skip unreadable files */ }
          }
        }
      } catch { /* skip dirs with errors */ }
    };

    await collectFiles(directoryHandle, '');
    return files;
  }

  /**
   * Read file content from local system
   * @param {string} basePath - Base folder name (workspace folder)
   * @param {string} relativePath - Relative file path
   * @returns {Promise<Object>} File content
   */
  async readFile(basePath, relativePath) {
    try {
      const cacheKey = `${basePath}::${relativePath}`;
      let fileHandle = this.fileHandles.get(cacheKey);
      
      if (!fileHandle) {
        // Get directory handle for this workspace
        const directoryHandle = this.directoryHandles.get(basePath);
        if (!directoryHandle) {
          throw new Error('Workspace folder not found. Please re-add the folder.');
        }

        // Navigate to file
        fileHandle = await this.getFileHandleByPath(directoryHandle, relativePath);
        if (!fileHandle) {
          throw new Error('File not found');
        }
        this.fileHandles.set(cacheKey, fileHandle);
      }

      const file = await fileHandle.getFile();
      const content = await file.text();

      return {
        success: true,
        content,
        size: file.size,
        lastModified: file.lastModified
      };
    } catch (error) {
      console.error('Read file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Write content to a local file
   * @param {string} basePath - Base folder name (workspace folder)
   * @param {string} relativePath - Relative file path
   * @param {string} content - File content to write
   * @returns {Promise<Object>} Write result
   */
  async writeFile(basePath, relativePath, content) {
    try {
      const cacheKey = `${basePath}::${relativePath}`;
      let fileHandle = this.fileHandles.get(cacheKey);

      if (!fileHandle) {
        // Get directory handle for this workspace
        const directoryHandle = this.directoryHandles.get(basePath);
        if (!directoryHandle) {
          throw new Error('Workspace folder not found. Please re-add the folder.');
        }

        // Try to get existing file or create new one
        fileHandle = await this.createFileByPath(directoryHandle, relativePath);
        this.fileHandles.set(cacheKey, fileHandle);
      }

      // Create a writable stream
      const writable = await fileHandle.createWritable();
      
      // Write content
      await writable.write(content);
      
      // Close the file
      await writable.close();

      return {
        success: true,
        path: relativePath
      };
    } catch (error) {
      console.error('Write file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new file
   * @param {string} filePath - File path (can include subdirectories)
   * @returns {Promise<FileSystemFileHandle>} File handle
   */
  async createFile(filePath) {
    try {
      if (!this.directoryHandle) {
        throw new Error('No directory selected');
      }

      const pathParts = filePath.split('/');
      const fileName = pathParts.pop();
      
      // Navigate to parent directory
      let currentDir = this.directoryHandle;
      for (const dirName of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
      }

      // Create file
      const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
      this.fileHandles.set(filePath, fileHandle);

      return fileHandle;
    } catch (error) {
      console.error('Create file error:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param {string} filePath - File path
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(filePath) {
    try {
      const pathParts = filePath.split('/');
      const fileName = pathParts.pop();
      
      // Navigate to parent directory
      let currentDir = this.directoryHandle;
      for (const dirName of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(dirName);
      }

      // Delete file
      await currentDir.removeEntry(fileName);
      this.fileHandles.delete(filePath);

      return {
        success: true
      };
    } catch (error) {
      console.error('Delete file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new folder
   * @param {string} folderPath - Folder path
   * @returns {Promise<Object>} Create result
   */
  async createFolder(basePath, relativePath) {
    try {
      const dirHandle = this.directoryHandles.get(basePath);
      if (!dirHandle) {
        throw new Error('Base directory not found');
      }

      // Normalize path separators to forward slashes
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/').filter(p => p);
      
      let currentDir = dirHandle;
      for (const dirName of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
      }

      return {
        success: true,
        path: relativePath
      };
    } catch (error) {
      console.error('Create folder error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a file or folder
   * @param {string} basePath - Base folder path
   * @param {string} relativePath - Relative path to delete
   * @returns {Promise<Object>} Result object
   */
  async deleteItem(basePath, relativePath) {
    try {
      console.log('🗑️ Delete item called:', { basePath, relativePath });
      
      const dirHandle = this.directoryHandles.get(basePath);
      if (!dirHandle) {
        throw new Error('Base directory not found');
      }

      // Normalize path separators to forward slashes
      const normalizedPath = relativePath.replace(/\\/g, '/');
      console.log('Normalized path:', normalizedPath);
      
      const pathParts = normalizedPath.split('/').filter(p => p);
      console.log('Path parts:', pathParts);
      
      const itemName = pathParts.pop();
      console.log('Item to delete:', itemName);
      console.log('Parent path parts:', pathParts);
      
      // Navigate to parent directory
      let currentDir = dirHandle;
      for (const dirName of pathParts) {
        console.log('Navigating to directory:', dirName);
        currentDir = await currentDir.getDirectoryHandle(dirName);
      }

      // Remove the item
      console.log('Removing entry:', itemName);
      await currentDir.removeEntry(itemName, { recursive: true });

      return {
        success: true
      };
    } catch (error) {
      console.error('Delete item error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rename a file or folder
   * @param {string} basePath - Base folder path
   * @param {string} oldRelativePath - Old relative path
   * @param {string} newName - New name
   * @returns {Promise<Object>} Result object
   */
  async renameItem(basePath, oldRelativePath, newName) {
    try {
      console.log('✏️ Rename item called:', { basePath, oldRelativePath, newName });
      
      const dirHandle = this.directoryHandles.get(basePath);
      if (!dirHandle) {
        throw new Error('Base directory not found');
      }

      // Normalize path separators to forward slashes
      const normalizedPath = oldRelativePath.replace(/\\/g, '/');
      console.log('Normalized path:', normalizedPath);
      
      const pathParts = normalizedPath.split('/').filter(p => p);
      console.log('Path parts:', pathParts);
      
      const oldName = pathParts.pop();
      console.log('Old name:', oldName);
      
      const parentPath = pathParts.join('/');
      console.log('Parent path:', parentPath);
      console.log('Parent path parts:', pathParts);
      
      // Navigate to parent directory
      let parentDir = dirHandle;
      for (const dirName of pathParts) {
        console.log('Navigating to directory:', dirName);
        parentDir = await parentDir.getDirectoryHandle(dirName);
      }

      // Check if item exists
      let isFolder = false;
      try {
        console.log('Checking if folder exists:', oldName);
        await parentDir.getDirectoryHandle(oldName);
        isFolder = true;
        console.log('✅ Found as folder');
      } catch {
        try {
          console.log('Checking if file exists:', oldName);
          await parentDir.getFileHandle(oldName);
          isFolder = false;
          console.log('✅ Found as file');
        } catch {
          console.error('❌ Item not found:', oldName);
          throw new Error('Item not found');
        }
      }

      // For File System Access API, we need to copy and delete
      // (there's no native rename operation)
      if (isFolder) {
        console.log('Renaming folder...');
        // Copy folder recursively
        const oldDirHandle = await parentDir.getDirectoryHandle(oldName);
        const newDirHandle = await parentDir.getDirectoryHandle(newName, { create: true });
        await this.copyDirectoryRecursive(oldDirHandle, newDirHandle);
        
        // Delete old folder
        await parentDir.removeEntry(oldName, { recursive: true });
      } else {
        console.log('Renaming file...');
        // Copy file
        const oldFileHandle = await parentDir.getFileHandle(oldName);
        const oldFile = await oldFileHandle.getFile();
        const newFileHandle = await parentDir.getFileHandle(newName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(await oldFile.arrayBuffer());
        await writable.close();
        
        // Delete old file
        await parentDir.removeEntry(oldName);
      }

      const newRelativePath = parentPath ? `${parentPath}/${newName}` : newName;
      console.log('✅ Rename successful. New path:', newRelativePath);

      return {
        success: true,
        renamedItem: {
          oldRelativePath: normalizedPath,
          newRelativePath,
          isFolder
        }
      };
    } catch (error) {
      console.error('Rename item error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Copy directory recursively
   * @param {FileSystemDirectoryHandle} sourceDir - Source directory handle
   * @param {FileSystemDirectoryHandle} targetDir - Target directory handle
   */
  async copyDirectoryRecursive(sourceDir, targetDir) {
    for await (const entry of sourceDir.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const newFileHandle = await targetDir.getFileHandle(entry.name, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(await file.arrayBuffer());
        await writable.close();
      } else if (entry.kind === 'directory') {
        const newDirHandle = await targetDir.getDirectoryHandle(entry.name, { create: true });
        await this.copyDirectoryRecursive(entry, newDirHandle);
      }
    }
  }

  /**
   * Move a file or folder
   * @param {string} sourceBasePath - Source base folder path
   * @param {string} sourceRelativePath - Source relative path
   * @param {string} targetBasePath - Target base folder path
   * @param {string} targetParentRelativePath - Target parent relative path
   * @returns {Promise<Object>} Result object
   */
  async moveItem(sourceBasePath, sourceRelativePath, targetBasePath, targetParentRelativePath) {
    try {
      const sourceDirHandle = this.directoryHandles.get(sourceBasePath);
      const targetDirHandle = this.directoryHandles.get(targetBasePath);
      
      if (!sourceDirHandle || !targetDirHandle) {
        throw new Error('Base directory not found');
      }

      // Normalize path separators to forward slashes
      const normalizedSourcePath = sourceRelativePath.replace(/\\/g, '/');
      const normalizedTargetPath = targetParentRelativePath ? targetParentRelativePath.replace(/\\/g, '/') : '';
      
      // Get item name
      const pathParts = normalizedSourcePath.split('/').filter(p => p);
      const itemName = pathParts.pop();
      
      // Navigate to source parent directory
      let sourceParentDir = sourceDirHandle;
      for (const dirName of pathParts) {
        sourceParentDir = await sourceParentDir.getDirectoryHandle(dirName);
      }

      // Navigate to target parent directory
      let targetParentDir = targetDirHandle;
      if (normalizedTargetPath) {
        const targetParts = normalizedTargetPath.split('/').filter(p => p);
        for (const dirName of targetParts) {
          targetParentDir = await targetParentDir.getDirectoryHandle(dirName);
        }
      }

      // Check if item is a folder or file
      let isFolder = false;
      let sourceItemHandle;
      try {
        sourceItemHandle = await sourceParentDir.getDirectoryHandle(itemName);
        isFolder = true;
      } catch {
        sourceItemHandle = await sourceParentDir.getFileHandle(itemName);
        isFolder = false;
      }

      // Copy to target
      if (isFolder) {
        const newDirHandle = await targetParentDir.getDirectoryHandle(itemName, { create: true });
        await this.copyDirectoryRecursive(sourceItemHandle, newDirHandle);
      } else {
        const file = await sourceItemHandle.getFile();
        const newFileHandle = await targetParentDir.getFileHandle(itemName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(await file.arrayBuffer());
        await writable.close();
      }

      // Delete from source
      await sourceParentDir.removeEntry(itemName, { recursive: true });

      const newTargetRelativePath = normalizedTargetPath ? 
        `${normalizedTargetPath}/${itemName}` : itemName;

      return {
        success: true,
        movedItemDetails: {
          originalSourceBaseFolderPath: sourceBasePath,
          originalSourceRelativePath: normalizedSourcePath,
          newTargetBaseFolderPath: targetBasePath,
          newTargetRelativePath,
          isFolder
        }
      };
    } catch (error) {
      console.error('Move item error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file handle by path from a directory handle
   * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle
   * @param {string} relativePath - Relative file path
   * @returns {Promise<FileSystemFileHandle|null>} File handle
   */
  async getFileHandleByPath(directoryHandle, relativePath) {
    try {
      // Normalize path separators to forward slashes
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/').filter(p => p);
      const fileName = pathParts.pop();
      
      let currentDir = directoryHandle;
      for (const dirName of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(dirName);
      }

      return await currentDir.getFileHandle(fileName);
    } catch (error) {
      console.error('Get file handle by path error:', error);
      return null;
    }
  }

  /**
   * Create file by path from a directory handle
   * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle
   * @param {string} relativePath - Relative file path
   * @returns {Promise<FileSystemFileHandle>} File handle
   */
  async createFileByPath(directoryHandle, relativePath) {
    try {
      // Normalize path separators to forward slashes
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/').filter(p => p);
      const fileName = pathParts.pop();
      
      // Navigate to parent directory, creating if necessary
      let currentDir = directoryHandle;
      for (const dirName of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
      }

      // Create or get file
      return await currentDir.getFileHandle(fileName, { create: true });
    } catch (error) {
      console.error('Create file by path error:', error);
      throw error;
    }
  }

  /**
   * Get file handle by path
   * @param {string} filePath - File path
   * @returns {Promise<FileSystemFileHandle|null>} File handle
   */
  async getFileHandle(filePath) {
    try {
      if (!this.directoryHandle) {
        return null;
      }

      const pathParts = filePath.split('/');
      const fileName = pathParts.pop();
      
      let currentDir = this.directoryHandle;
      for (const dirName of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(dirName);
      }

      return await currentDir.getFileHandle(fileName);
    } catch (error) {
      console.error('Get file handle error:', error);
      return null;
    }
  }

  /**
   * Check if we have permission to access the directory
   * @returns {Promise<boolean>} Permission status
   */
  async checkPermission() {
    if (!this.directoryHandle) {
      return false;
    }

    const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
  }

  /**
   * Request permission to access the directory
   * @returns {Promise<boolean>} Permission granted
   */
  async requestPermission() {
    if (!this.directoryHandle) {
      return false;
    }

    const permission = await this.directoryHandle.requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  }

  /**
   * Restore a saved folder from IndexedDB
   * @param {string} folderName - Name of the folder to restore
   * @returns {Promise<Object>} Folder data or error
   */
  async restoreSavedFolder(folderName) {
    try {
      const handle = await this.loadDirectoryHandle(folderName);
      
      if (!handle) {
        return {
          success: false,
          error: 'Folder not found in storage'
        };
      }

      // Check current permission status
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      
      if (permission === 'granted') {
        // We have permission! Scan directory structure
        const folderStructure = await this.scanDirectory(handle);
        this.directoryHandles.set(folderName, handle);
        return {
          success: true,
          name: folderName,
          path: folderName,
          structure: folderStructure
        };
      }

      if (permission === 'denied') {
        // User explicitly denied — remove from storage
        return {
          success: false,
          error: 'Permission denied by user.',
          permissionDenied: true
        };
      }

      // permission === 'prompt': handle exists but needs user gesture to re-grant
      // Keep handle in memory so restoreFolderWithPermission can use it
      this.directoryHandles.set(folderName, handle);
      return {
        success: false,
        error: 'Needs permission re-grant.',
        needsPermission: true
      };
    } catch (error) {
      console.error('Restore folder error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Called inside a user gesture — requests permission for a folder whose handle
   * is already loaded in memory (after restoreSavedFolder returned needsPermission).
   */
  async restoreFolderWithPermission(folderName) {
    try {
      let handle = this.directoryHandles.get(folderName);
      if (!handle) {
        handle = await this.loadDirectoryHandle(folderName);
        if (!handle) {
          return { success: false, error: 'Handle not found in storage.' };
        }
        this.directoryHandles.set(folderName, handle);
      }

      const permission = await handle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        return { success: false, error: 'Permission was not granted.' };
      }

      const folderStructure = await this.scanDirectory(handle);
      return {
        success: true,
        name: folderName,
        path: folderName,
        structure: folderStructure
      };
    } catch (error) {
      console.error('restoreFolderWithPermission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Clear cached file handles
   */
  clearCache() {
    this.fileHandles.clear();
    this.directoryHandle = null;
  }

  /**
   * Get current directory name
   * @returns {string|null} Directory name
   */
  getCurrentDirectoryName() {
    return this.directoryHandle ? this.directoryHandle.name : null;
  }
}

export default new LocalFileSystemService();

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const server = require('./server'); // Assuming server.js exports the app or a start function

// Helper function to find the best matching workspace path
function getWorkspaceRelativePaths(filePath, workspacePaths) {
  if (!filePath) return null;

  let bestMatch = null;
  for (const wsPath of workspacePaths) {
    const normalizedWsPath = path.resolve(wsPath);
    const normalizedFilePath = path.resolve(filePath);

    if (normalizedFilePath.startsWith(normalizedWsPath + path.sep) || normalizedFilePath === normalizedWsPath) {
      // Check if this workspace is a more specific match than previous ones
      if (!bestMatch || normalizedWsPath.length > bestMatch.basePath.length) {
        const relativePath = path.relative(normalizedWsPath, normalizedFilePath).replace(/\\/g, '/');
        bestMatch = {
          basePath: normalizedWsPath.replace(/\\/g, '/'), // Ensure consistent path separators
          relativePath: relativePath || path.basename(normalizedFilePath) // if relativePath is empty, it means filePath is the basePath itself
        };
      }
    }
  }
  // If no workspace matches, but we still got a file path (e.g. user saved outside configured workspaces)
  // We can decide to handle this by returning the full path and an indicator, or an error.
  // For now, let's prioritize workspace paths. If no match, it might indicate an issue or a need for broader handling.
  // If no workspace path contains the filePath, we might treat the parent directory as base and filename as relative.
  if (!bestMatch && filePath) {
    // Fallback: treat the file's directory as base, and filename as relative.
    // This might not be what the frontend always expects for 'basePath' in a workspace context.
    // Consider if this fallback is appropriate or if an error/specific flag should be returned.
    // For now, let's stick to requiring it to be in a workspace for simplicity with current frontend logic.
    // If not in any workspace, perhaps it's an error or needs a different kind of handling.
    // For this implementation, we will return null if not in a workspace to signal an issue.
    // This can be refined based on exact requirements for out-of-workspace saves.
    console.warn(`File path ${filePath} is not within any of the provided workspace paths: ${workspacePaths.join(', ')}`);
    return null; 
  }
  return bestMatch;
}


function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    frame: true, // Keep window controls
    titleBarStyle: 'default', // Use default title bar
    backgroundColor: '#1e1e1e', // Match your app's background color
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional: if you need a preload script
      contextIsolation: true,
      nodeIntegration: false, // Recommended for security
    },
  });

  // Maximize the window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Load the frontend.
  // In development: load from the built frontend/dist folder
  // In production: load from the packaged frontend/dist folder
  let frontendUrl;
  if (app.isPackaged) {
    // In packaged app, files are in resources/app
    frontendUrl = `file://${path.join(__dirname, 'frontend/dist/index.html')}`;
  } else {
    // In development, load from relative path
    frontendUrl = `file://${path.join(__dirname, '../frontend/dist/index.html')}`;
  }
  
  if (process.env.NODE_ENV === 'development') { 
    // This URL would need to match your Vite dev server's port
    // frontendUrl = 'http://localhost:5173'; // Default Vite port, adjust if needed
    // For now, sticking to file protocol, assuming build is always available or handled by start script
  }
  mainWindow.loadURL(frontendUrl)
    .then(() => console.log('Frontend loaded successfully from:', frontendUrl))
    .catch(err => console.error('Failed to load frontend from:', frontendUrl, err));

  // Open the DevTools (optional, for debugging)
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Start the backend server
  // Assuming server.js starts listening on a port.
  // If server.js exports a function to start, call it here.
  // For now, just requiring it might be enough if it starts itself.
  // If your server.js exports the Express app instance, you might need to call app.listen here.
  // For simplicity, let's assume server.js handles its own start.
  // If not, we'll need to adjust this.
  // Example: if server.js exports a start function:
  // const { startServer } = require('./server');
  // startServer().then(() => createWindow());

  // For now, assuming server.js starts itself upon require
  // If it doesn't, the backend won't run.
  // We will need to check how server.js is structured.
  console.log('Backend server (server.js) starting via require()...');
  // No explicit start call here, assuming server.js does it.
  // This is a common pattern, but might need adjustment.

  createWindow();

  // IPC handler for showing save dialog
  ipcMain.handle('show-save-dialog', async (event, args) => {
    const { defaultPath, defaultName, workspacePaths } = args;
    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      console.error('No focused window to show save dialog.');
      return { cancelled: true, error: 'No focused window' };
    }

    let dialogDefaultPath = defaultPath;
    if (defaultPath && defaultName && defaultPath !== '__new_unsaved__') {
        // If defaultPath is a directory, join with defaultName
        // If defaultPath is a file path already, it might be used directly or its dirname.
        // For showSaveDialog, defaultPath should ideally be a directory or a full file path.
        // Let's ensure it's a full path if possible, or just the directory.
        try {
            const stats = require('fs').statSync(defaultPath);
            if (stats.isDirectory()) {
                dialogDefaultPath = path.join(defaultPath, defaultName);
            } else { // It's a file, use its directory
                dialogDefaultPath = path.join(path.dirname(defaultPath), defaultName);
            }
        } catch (e) { // Path doesn't exist or not a dir, use defaultName if available
            if (workspacePaths && workspacePaths.length > 0 && defaultName) {
                 dialogDefaultPath = path.join(workspacePaths[0], defaultName); // Fallback to first workspace + name
            } else if (defaultName) {
                dialogDefaultPath = defaultName; // Or just the name
            } else {
                dialogDefaultPath = app.getPath('documents'); // Absolute fallback
            }
        }
    } else if (workspacePaths && workspacePaths.length > 0) {
        dialogDefaultPath = path.join(workspacePaths[0], defaultName || '');
    } else {
        dialogDefaultPath = app.getPath('documents'); // Fallback if no sensible default
    }


    try {
      const result = await dialog.showSaveDialog(window, {
        title: 'שמירה בשם',
        defaultPath: dialogDefaultPath,
        filters: [
          { name: 'קבצי טקסט', extensions: ['txt', 'md', 'json', 'js', 'jsx', 'html', 'css', 'log'] },
          { name: 'כל הקבצים', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { cancelled: true };
      }

      const selectedFilePath = result.filePath.replace(/\\/g, '/');
      const pathDetails = getWorkspaceRelativePaths(selectedFilePath, workspacePaths);

      if (!pathDetails) {
        // Handle case where file is saved outside of any known workspace.
        // This might be an error, or you might want to allow it and handle differently.
        // For now, returning an error to align with expected newBasePath/newRelativePath structure.
        console.error(`שגיאה: הקובץ נשמר מחוץ לתיקיות העבודה המוגדרות. נתיב: ${selectedFilePath}`);
        return { 
            cancelled: true, 
            error: 'הקובץ חייב להישמר בתוך אחת מתיקיות העבודה המוגדרות.' 
        };
      }
      
      return {
        cancelled: false,
        filePath: selectedFilePath, // Full path
        newBasePath: pathDetails.basePath, // Workspace base path
        newRelativePath: pathDetails.relativePath, // Path relative to workspace base
      };
    } catch (error) {
      console.error('שגיאה בהצגת דיאלוג שמירה:', error);
      return { cancelled: true, error: error.message };
    }
  });

  // IPC handler for showing directory picker
  ipcMain.handle('show-directory-picker', async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      console.error('No focused window to show directory picker.');
      return { canceled: true, error: 'No focused window' };
    }

    try {
      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory'],
        title: 'בחר תיקייה לשמירת הקובץ'
      });

      return result;
    } catch (error) {
      console.error('שגיאה בהצגת בוחר התיקיות:', error);
      return { canceled: true, error: error.message };
    }
  });

  // IPC handler for closing the application
  ipcMain.handle('close-app', async () => {
    try {
      app.quit();
      return true;
    } catch (error) {
      console.error('Error closing application:', error);
      return false;
    }
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Optional: Create a preload.js if you need to expose Node.js APIs to the renderer securely
// For example, backend/preload.js:
/*
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Example function:
  // sendToMain: (channel, data) => ipcRenderer.send(channel, data),
  // receiveFromMain: (channel, func) => {
  //   ipcRenderer.on(channel, (event, ...args) => func(...args))
  // }
})
*/

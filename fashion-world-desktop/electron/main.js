const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Check if running in development mode
const isDev = process.argv.includes('--dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Recommended for security
      nodeIntegration: false, // Recommended for security
    },
  });

  if (isDev) {
    // Load from Vite dev server
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // Open dev tools automatically
  } else {
    // Load from the built React app
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- IPC HANDLER FOR SAVING BARCODE ---
ipcMain.handle('dialog:save-barcode', async (event, { pngDataUrl, defaultPath }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Barcode As',
    defaultPath: defaultPath,
    filters: [{ name: 'PNG Images', extensions: ['png'] }],
  });

  if (canceled || !filePath) {
    return { success: false, reason: 'Dialog canceled' };
  }

  try {
    // The data URL is "data:image/png;base64,iVBORw0KGgo...", we need to remove the header.
    const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filePath, base64Data, 'base64');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Failed to save the file:', error);
    return { success: false, reason: error.message };
  }
});

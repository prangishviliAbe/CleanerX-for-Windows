const electron = require('electron');
const path = require('path');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
const cleaner = require('./cleaner.js');

ipcMain.handle('clean-temp', async () => {
  return await cleaner.cleanTempFiles();
});

ipcMain.handle('clean-browser-cache', async () => {
  return await cleaner.cleanBrowserCache();
});

ipcMain.handle('clean-recycle-bin', async () => {
  return await cleaner.cleanRecycleBin();
});

ipcMain.handle('clean-system-logs', async () => {
  return await cleaner.cleanSystemLogs();
});

ipcMain.handle('get-system-info', async () => {
  return await cleaner.getSystemInfo();
});

ipcMain.handle('quick-scan', async () => {
  return await cleaner.quickScan();
});

ipcMain.handle('full-clean', async () => {
  return await cleaner.fullClean();
});

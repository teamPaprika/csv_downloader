const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
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

ipcMain.on('select-csv', async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (filePaths.length > 0) {
    event.sender.send('csv-selected', filePaths[0]);
  }
});

ipcMain.on('select-folder', async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (filePaths.length > 0) {
    event.sender.send('folder-selected', filePaths[0]);
  }
});


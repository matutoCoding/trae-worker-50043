import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWindow } from './window.js';
import { registerFileHandlers } from './fileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

app.whenReady().then(() => {
  createWindow();
  registerFileHandlers();

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

ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:show-save-dialog', async (_event, options) => {
  return dialog.showSaveDialog(options);
});

ipcMain.handle('app:show-open-dialog', async (_event, options) => {
  return dialog.showOpenDialog(options);
});

import { ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

export function registerFileHandlers(): void {
  ipcMain.handle('file:export', async (_event, data: unknown, filename: string) => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出数据',
        defaultPath: filename,
        filters: [{ name: 'JSON 文件', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePath) {
        return false;
      }

      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(result.filePath, jsonData, 'utf-8');
      return true;
    } catch (error) {
      console.error('Export error:', error);
      return false;
    }
  });

  ipcMain.handle('file:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '导入数据',
        filters: [{ name: 'JSON 文件', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0];
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Import error:', error);
      return null;
    }
  });

  ipcMain.handle('file:read-json', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Read JSON error:', error);
      return null;
    }
  });

  ipcMain.handle('file:write-json', async (_event, filePath: string, data: unknown) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf-8');
      return true;
    } catch (error) {
      console.error('Write JSON error:', error);
      return false;
    }
  });
}

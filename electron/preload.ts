import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke('app:show-save-dialog', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('app:show-open-dialog', options),
  exportData: (data: unknown, filename: string) =>
    ipcRenderer.invoke('file:export', data, filename),
  importData: () => ipcRenderer.invoke('file:import'),
});

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
      exportData: (data: unknown, filename: string) => Promise<boolean>;
      importData: () => Promise<unknown | null>;
    };
  }
}

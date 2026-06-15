export interface ElectronAPI {
  getVersion: () => Promise<string>;
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  exportData: (data: unknown, filename: string) => Promise<boolean>;
  importData: () => Promise<unknown | null>;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

export interface OpenDialogOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: string[];
}

export interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

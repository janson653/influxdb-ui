import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnectionRepository, type StoredConnectionConfig } from './connectionStore.js';
import { queryInfluxData, testConnectionWithAuth } from './influxHttp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:1420';

function resolveWindowIconPath(): string | undefined {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icons', 'icon.png')
    : path.join(__dirname, '../electron/assets/icons/icon.png');

  return existsSync(iconPath) ? iconPath : undefined;
}

function registerIpcHandlers(): void {
  const connectionRepository = createConnectionRepository(app.getPath('userData'));

  ipcMain.handle('connections:load', () => connectionRepository.load());
  ipcMain.handle('connections:store', (_event, config: StoredConnectionConfig) =>
    connectionRepository.store(config),
  );
  ipcMain.handle('connections:delete', (_event, connectionId: string) =>
    connectionRepository.deleteConnection(connectionId),
  );
  ipcMain.handle('influx:test-connection', (_event, payload) => testConnectionWithAuth(payload));
  ipcMain.handle('influx:query', (_event, payload) => queryInfluxData(payload));
  ipcMain.handle('app:open-external', (_event, url: string) => shell.openExternal(url));
}

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');
  const indexPath = path.join(__dirname, '../dist/index.html');

  const window = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'influxdb-ui',
    icon: resolveWindowIconPath(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    void window.loadFile(indexPath);
  } else {
    void window.loadURL(DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
  }

  return window;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

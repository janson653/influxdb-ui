import { contextBridge, ipcRenderer } from 'electron';

interface StoredConnectionConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  database: string;
  is_encrypted: boolean;
}

interface TestConnectionPayload {
  url: string;
  database: string;
  username?: string;
  password?: string;
}

interface QueryPayload extends TestConnectionPayload {
  query_string: string;
  influxdb_url: string;
  influxdb_database: string;
}

const electronAPI = Object.freeze({
  isElectron: true,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
  connections: {
    load: () => ipcRenderer.invoke('connections:load') as Promise<StoredConnectionConfig[]>,
    store: (config: StoredConnectionConfig) => ipcRenderer.invoke('connections:store', config) as Promise<void>,
    deleteConnection: (connectionId: string) =>
      ipcRenderer.invoke('connections:delete', connectionId) as Promise<void>,
  },
  influx: {
    testConnection: (payload: TestConnectionPayload) =>
      ipcRenderer.invoke('influx:test-connection', payload) as Promise<boolean>,
    queryData: (payload: QueryPayload) =>
      ipcRenderer.invoke('influx:query', payload) as Promise<string>,
  },
  app: {
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url) as Promise<void>,
  },
});

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

/// <reference types="vite/client" />

interface ElectronStoredConnectionConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  database: string;
  is_encrypted: boolean;
}

interface ElectronTestConnectionPayload {
  url: string;
  database: string;
  username?: string;
  password?: string;
}

interface ElectronQueryPayload extends ElectronTestConnectionPayload {
  query_string: string;
  influxdb_url: string;
  influxdb_database: string;
}

interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
  connections: {
    load: () => Promise<ElectronStoredConnectionConfig[]>;
    store: (config: ElectronStoredConnectionConfig) => Promise<void>;
    deleteConnection: (connectionId: string) => Promise<void>;
  };
  influx: {
    testConnection: (payload: ElectronTestConnectionPayload) => Promise<boolean>;
    queryData: (payload: ElectronQueryPayload) => Promise<string>;
  };
  app: {
    openExternal: (url: string) => Promise<void>;
  };
}

interface Window {
  electronAPI?: ElectronAPI;
}

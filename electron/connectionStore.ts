import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface StoredConnectionConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  database: string;
  is_encrypted: boolean;
}

const STORAGE_FILE = 'connections.json';

export function createConnectionRepository(baseDir: string) {
  const storagePath = path.join(baseDir, STORAGE_FILE);

  async function readConnections(): Promise<StoredConnectionConfig[]> {
    try {
      const raw = await readFile(storagePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async function writeConnections(connections: StoredConnectionConfig[]): Promise<void> {
    await mkdir(path.dirname(storagePath), { recursive: true });
    await writeFile(storagePath, JSON.stringify(connections, null, 2), 'utf-8');
  }

  return {
    storagePath,
    async load(): Promise<StoredConnectionConfig[]> {
      return readConnections();
    },
    async store(config: StoredConnectionConfig): Promise<void> {
      const connections = await readConnections();
      const index = connections.findIndex((item) => item.id === config.id);

      if (index >= 0) {
        connections[index] = config;
      } else {
        connections.push(config);
      }

      await writeConnections(connections);
    },
    async deleteConnection(connectionId: string): Promise<void> {
      const connections = await readConnections();
      await writeConnections(connections.filter((item) => item.id !== connectionId));
    },
  };
}

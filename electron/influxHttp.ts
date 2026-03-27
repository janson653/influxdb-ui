import { Buffer } from 'node:buffer';

export interface InfluxAuthPayload {
  url: string;
  username?: string;
  password?: string;
}

export interface InfluxQueryPayload extends InfluxAuthPayload {
  query_string: string;
  influxdb_url: string;
  influxdb_database: string;
}

interface InfluxQueryResponse {
  results?: Array<{
    error?: string;
    series?: unknown[];
  }>;
  error?: string;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function createAuthHeaders(username?: string, password?: string): Headers {
  const headers = new Headers();

  // InfluxDB 1.x supports HTTP Basic Auth for both /ping and /query.
  if (typeof username === 'string' && typeof password === 'string') {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    headers.set('Authorization', `Basic ${credentials}`);
  }

  return headers;
}

async function readErrorBody(response: Response): Promise<string> {
  const body = await response.text();
  return body.trim() || `${response.status} ${response.statusText}`;
}

export async function testConnectionWithAuth(payload: InfluxAuthPayload): Promise<boolean> {
  const baseUrl = trimTrailingSlash(payload.url);
  const response = await fetch(`${baseUrl}/ping`, {
    method: 'GET',
    headers: createAuthHeaders(payload.username, payload.password),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`InfluxDB ping failed: ${await readErrorBody(response)}`);
  }

  return true;
}

export async function queryInfluxData(payload: InfluxQueryPayload): Promise<string> {
  const baseUrl = trimTrailingSlash(payload.influxdb_url);
  const body = new URLSearchParams({
    db: payload.influxdb_database,
    q: payload.query_string,
  });

  const headers = createAuthHeaders(payload.username, payload.password);
  headers.set('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
  headers.set('Accept', 'application/json');

  const response = await fetch(`${baseUrl}/query`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`InfluxDB query failed: ${await readErrorBody(response)}`);
  }

  const result = (await response.json()) as InfluxQueryResponse;
  if (result.error) {
    throw new Error(result.error);
  }

  const results = result.results ?? [];
  const statementError = results.find((item) => item.error);
  if (statementError?.error) {
    throw new Error(statementError.error);
  }

  const series = results.flatMap((item) => item.series ?? []);
  return JSON.stringify(series);
}

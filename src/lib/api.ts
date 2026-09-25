import { isTauri } from './desktop';

export interface ApiErrorBody {
  error?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Mirrors `ApiResponse` in src-tauri/src/backend/mod.rs. */
interface DesktopApiResponse {
  status: number;
  body: unknown;
}

function unwrap<T>(status: number, data: unknown): T {
  if (status === 204) return undefined as T;
  if (status < 200 || status >= 300) {
    const message = (data as ApiErrorBody | null)?.error || `Request failed (HTTP ${status})`;
    throw new ApiError(status, message);
  }
  return data as T;
}

/** Desktop app: same routes, served by the Rust backend inside Tauri instead of HTTP. */
async function desktopRequest<T>(method: string, path: string, body: unknown, token?: string | null): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  let res: DesktopApiResponse;
  try {
    res = await invoke<DesktopApiResponse>('api_request', {
      method,
      path,
      body: body === undefined ? null : body,
      token: token || null
    });
  } catch (err) {
    throw new ApiError(500, err instanceof Error ? err.message : String(err));
  }
  return unwrap<T>(res.status, res.body);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const normalizedPath = path.startsWith('/api')
    ? path
    : `/api${path.startsWith('/') ? path : `/${path}`}`;

  if (isTauri()) return desktopRequest<T>(method, normalizedPath, body, token);

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(normalizedPath, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the local app server. Is it running? (npm run dev)');
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return unwrap<T>(res.status, data);
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body, token }),
  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'PUT', body, token }),
  del: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'DELETE', body, token })
};
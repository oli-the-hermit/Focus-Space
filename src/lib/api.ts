import { isTauri } from './desktop';
import { strings } from '../constants/strings';
import { format, type TemplateVars } from './i18n';

/** Codes both backends can send; each has its message in strings.errors.api. */
export type ApiErrorCode = keyof typeof strings.errors.api;

/** Error body from server/app.js and the Rust port: a code, never a sentence. */
export interface ApiErrorBody {
  code?: string;
  params?: TemplateVars;
}

export class ApiError extends Error {
  status: number;
  code?: ApiErrorCode;

  constructor(status: number, message: string, code?: ApiErrorCode) {
    super(message || format(strings.errors.requestInterruptedCode, { status }));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isKnownCode(code: unknown): code is ApiErrorCode {
  return typeof code === 'string' && code in strings.errors.api;
}

/** Turns an error body into the user-facing message for its code. */
function errorFrom(status: number, data: unknown): ApiError {
  const body = (data ?? {}) as ApiErrorBody;
  if (isKnownCode(body.code)) {
    return new ApiError(status, format(strings.errors.api[body.code], body.params ?? {}), body.code);
  }
  return new ApiError(status, format(strings.errors.requestInterruptedCode, { status }));
}

/** Mirrors `ApiResponse` in src-tauri/src/backend/mod.rs. */
interface DesktopApiResponse {
  status: number;
  body: unknown;
}

function unwrap<T>(status: number, data: unknown): T {
  if (status === 204) return undefined as T;
  if (status < 200 || status >= 300) throw errorFrom(status, data);
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
    throw new ApiError(0, strings.auth.serverUnreachable);
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
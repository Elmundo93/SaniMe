import * as Crypto from 'expo-crypto';
import { useAuthStore } from '../../store/authStore';
import { resolveApiBaseUrl } from './config';

interface ErrorEnvelope {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  body?: unknown;
  idempotent?: boolean;
  auth?: boolean;
}

// Backend's global AllExceptionsFilter always flattens errors to this shape
// (message is always a plain string, arrays already joined server-side) —
// see apps/backend/src/common/filters/all-exceptions.filter.ts.
export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (opts.idempotent) headers['Idempotency-Key'] = Crypto.randomUUID();

  const res = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const envelope = payload as ErrorEnvelope | null;
    throw new ApiError(res.status, envelope?.message ?? 'Unbekannter Serverfehler');
  }

  return payload as T;
}

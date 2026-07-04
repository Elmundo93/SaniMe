import { request } from './client';

export function createUploadUrl(mimeType: string): Promise<{ storageKey: string; uploadUrl: string }> {
  return request('POST', '/documents/upload-url', { body: { mimeType } });
}

// Raw PUT straight to the presigned S3/MinIO URL — bypasses request()
// entirely, no Authorization header, no JSON envelope, no /api/v1 prefix.
export async function uploadRaw(uploadUrl: string, uri: string, mimeType: string): Promise<void> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: blob });
  if (!putRes.ok) {
    throw new Error(`Upload fehlgeschlagen (${putRes.status})`);
  }
}

export function register(input: {
  type: string;
  storageKey: string;
  hash: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ id: string; status: string }> {
  return request('POST', '/documents', { body: input });
}

export function getById(id: string): Promise<any> {
  return request('GET', `/documents/${id}`);
}

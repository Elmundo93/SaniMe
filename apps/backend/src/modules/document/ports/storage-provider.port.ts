export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface PresignedUpload {
  storageKey: string;
  uploadUrl: string;
}

// One concrete implementation (S3-compatible, backed by MinIO locally — see
// s3-storage.provider.ts) per Principle 7. Swapping to real AWS S3 later is
// an endpoint/credential change only, no code change, because the SDK used
// against MinIO is identical to the SDK used against real S3.
export interface StorageProvider {
  createPresignedUpload(mimeType: string): Promise<PresignedUpload>;
  objectExists(storageKey: string): Promise<boolean>;
  createPresignedDownload(storageKey: string): Promise<string>;
}

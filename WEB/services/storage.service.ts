// ─── Storage Upload Service ──────────────────────────────────────────────────
// Client-side service for uploading files to Supabase Storage via the
// server-side /api/upload endpoint. Validates locally first, then delegates
// to the server for magic-byte re-validation and actual upload.
// ─────────────────────────────────────────────────────────────────────────────

import {
  type StorageBucket,
  type UploadValidationError,
  validateFileClient,
} from "@/lib/storage";

export interface UploadResult {
  path: string;
  publicUrl: string;
  bucket: StorageBucket;
  sniffedMime: string;
}

export interface UploadOptions {
  bucket: StorageBucket;
  file: File;
  /** Required for reviews bucket */
  orderId?: string;
  /** Required for restaurants and banners buckets */
  resourceId?: string;
}

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly validationErrors?: UploadValidationError[],
  ) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Upload a file through the server-side endpoint.
 *
 * 1. Runs client-side validation (MIME, extension, byte size)
 * 2. POSTs to /api/upload which re-validates with magic-byte sniffing
 * 3. Returns the storage path and public URL
 *
 * @throws {UploadError} on validation failure or server error.
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, file, orderId, resourceId } = options;

  // ─── Client-side pre-validation ────────────────────────────────────
  const errors = validateFileClient(file, bucket);
  if (errors.length > 0) {
    throw new UploadError(errors[0].message, errors);
  }

  // ─── Build form data ──────────────────────────────────────────────
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  if (orderId) formData.append("orderId", orderId);
  if (resourceId) formData.append("resourceId", resourceId);

  // ─── POST to server ───────────────────────────────────────────────
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new UploadError(body.error ?? `Upload failed (${response.status})`);
  }

  return response.json() as Promise<UploadResult>;
}

/**
 * Upload an avatar image and return the public URL to store in
 * profiles.avatar_url.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const result = await uploadFile({ bucket: "avatars", file });
  return result.publicUrl;
}

/**
 * Upload review images and return the public URLs to store in
 * reviews.images[].
 */
export async function uploadReviewImages(
  files: File[],
  orderId: string,
): Promise<string[]> {
  const results = await Promise.all(
    files.map((file) => uploadFile({ bucket: "reviews", file, orderId })),
  );
  return results.map((r) => r.publicUrl);
}

/**
 * Upload a restaurant image and return the public URL to store in
 * restaurants.image_url.
 */
export async function uploadRestaurantImage(
  file: File,
  restaurantId: string,
): Promise<string> {
  const result = await uploadFile({
    bucket: "restaurants",
    file,
    resourceId: restaurantId,
  });
  return result.publicUrl;
}

/**
 * Upload a banner image and return the public URL to store in
 * banners.image_url.
 */
export async function uploadBannerImage(
  file: File,
  bannerId: string,
): Promise<string> {
  const result = await uploadFile({
    bucket: "banners",
    file,
    resourceId: bannerId,
  });
  return result.publicUrl;
}

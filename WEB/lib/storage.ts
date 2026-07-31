// ─── Storage Upload Helpers ──────────────────────────────────────────────────
// Shared validation for Supabase Storage uploads.
// Client-side: validates MIME, extension, and byte size before uploading.
// Server-side API route: re-validates with magic-byte sniffing.
//
// Architecture note: this file is imported by both client components and the
// server-side API route, so it must contain NO server-only imports (no
// supabase-admin, no process.env secrets). The server-side upload endpoint
// imports from here and adds the service-role client itself.
// ─────────────────────────────────────────────────────────────────────────────

export type StorageBucket = "avatars" | "reviews" | "restaurants" | "banners";

// ─── Per-bucket config ───────────────────────────────────────────────────────

export interface BucketConfig {
  /** Maximum upload size in bytes */
  maxBytes: number;
  /** Allowed MIME types */
  allowedMimeTypes: readonly string[];
  /** Allowed file extensions (lowercase, with dot) */
  allowedExtensions: readonly string[];
}

export const BUCKET_CONFIG: Record<StorageBucket, BucketConfig> = {
  avatars: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  },
  reviews: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  restaurants: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  banners: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
} as const;

// ─── Client-side validation ──────────────────────────────────────────────────

export interface UploadValidationError {
  field: string;
  message: string;
}

/**
 * Validate a file on the client before uploading.
 * Returns an array of errors (empty = valid).
 */
export function validateFileClient(
  file: File,
  bucket: StorageBucket,
): UploadValidationError[] {
  const errors: UploadValidationError[] = [];
  const config = BUCKET_CONFIG[bucket];

  // 1. Check byte size
  if (file.size > config.maxBytes) {
    const maxMB = (config.maxBytes / (1024 * 1024)).toFixed(0);
    errors.push({
      field: "file",
      message: `File exceeds the ${maxMB} MB limit`,
    });
  }

  if (file.size === 0) {
    errors.push({ field: "file", message: "File is empty" });
  }

  // 2. Check MIME type (client-reported, not trusted — rechecked server-side)
  if (!config.allowedMimeTypes.includes(file.type)) {
    errors.push({
      field: "file",
      message: `File type "${file.type || "unknown"}" is not allowed. Accepted: ${config.allowedMimeTypes.join(", ")}`,
    });
  }

  // 3. Check file extension
  const ext = getExtension(file.name);
  if (!config.allowedExtensions.includes(ext)) {
    errors.push({
      field: "file",
      message: `Extension "${ext || "(none)"}" is not allowed. Accepted: ${config.allowedExtensions.join(", ")}`,
    });
  }

  return errors;
}

// ─── Magic-byte sniffing (server-side) ───────────────────────────────────────

/**
 * Map of magic byte signatures → MIME type.
 * Checked against the first N bytes of the uploaded file.
 */
const MAGIC_SIGNATURES: Array<{ bytes: number[]; mask?: number[]; offset?: number; mime: string }> = [
  // JPEG: FF D8 FF
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: "image/png" },
  // WebP: RIFF....WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" }, // first check RIFF
  // GIF87a / GIF89a
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], mime: "image/gif" },
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], mime: "image/gif" },
];

/**
 * Sniff the MIME type from the raw bytes of a file.
 * Returns null if unrecognised. Never trusts the client Content-Type.
 */
export function sniffMimeType(buffer: ArrayBuffer): string | null {
  const header = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 16));

  for (const sig of MAGIC_SIGNATURES) {
    if (header.length < sig.bytes.length) continue;
    const offset = sig.offset ?? 0;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      const byte = header[offset + i];
      const expected = sig.bytes[i];
      const mask = sig.mask?.[i] ?? 0xff;
      if ((byte & mask) !== expected) {
        match = false;
        break;
      }
    }
    if (match) {
      // Extra check for WebP: bytes 8-11 must be WEBP
      if (sig.mime === "image/webp") {
        const webpTag = new Uint8Array(buffer, 8, 4);
        if (
          webpTag[0] !== 0x57 || // W
          webpTag[1] !== 0x45 || // E
          webpTag[2] !== 0x42 || // B
          webpTag[3] !== 0x50    // P
        ) {
          continue; // RIFF but not WEBP — skip
        }
      }
      return sig.mime;
    }
  }
  return null;
}

/**
 * Validate the raw file bytes on the server.
 * Returns the sniffed MIME type on success, or throws a descriptive Error.
 */
export function validateFileServer(
  buffer: ArrayBuffer,
  fileName: string,
  bucket: StorageBucket,
): string {
  const config = BUCKET_CONFIG[bucket];

  // 1. Size
  if (buffer.byteLength === 0) {
    throw new Error("Uploaded file is empty");
  }
  if (buffer.byteLength > config.maxBytes) {
    const maxMB = (config.maxBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`File exceeds the ${maxMB} MB size limit`);
  }

  // 2. Extension
  const ext = getExtension(fileName);
  if (!config.allowedExtensions.includes(ext)) {
    throw new Error(
      `Extension "${ext || "(none)"}" is not allowed. Accepted: ${config.allowedExtensions.join(", ")}`,
    );
  }

  // 3. Magic-byte MIME sniffing (never trust client Content-Type)
  const sniffed = sniffMimeType(buffer);
  if (!sniffed) {
    throw new Error("Unable to determine file type from file contents");
  }
  if (!config.allowedMimeTypes.includes(sniffed)) {
    throw new Error(
      `Detected file type "${sniffed}" is not allowed. Accepted: ${config.allowedMimeTypes.join(", ")}`,
    );
  }

  return sniffed;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Extract the lowercase file extension including the dot. */
export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot).toLowerCase();
}

/**
 * Build the storage path for an upload.
 */
export function buildStoragePath(
  bucket: StorageBucket,
  segments: string[],
  fileName: string,
): string {
  // Sanitise segments — only allow uuid-like strings
  const safe = segments.map((s) => s.replace(/[^a-zA-Z0-9_-]/g, ""));
  const ext = getExtension(fileName);
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  return [...safe, uniqueName].join("/");
}

/**
 * Get the public URL for an object in a public bucket.
 */
export function getPublicUrl(
  supabaseUrl: string,
  bucket: StorageBucket,
  path: string,
): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

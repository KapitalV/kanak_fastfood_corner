import { NextResponse, type NextRequest } from "next/server";
import { requireUser, requireRole, requireOwnership, handleAuthError } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { logServerError } from "@/lib/server-logger";
import {
  type StorageBucket,
  BUCKET_CONFIG,
  validateFileServer,
  buildStoragePath,
  getPublicUrl,
} from "@/lib/storage";

/**
 * POST /api/upload
 *
 * Server-side upload endpoint. Re-validates every upload with magic-byte
 * sniffing — never trusts the client-reported MIME type.
 *
 * Body: multipart/form-data with fields:
 *   - file: the file blob
 *   - bucket: "avatars" | "reviews" | "restaurants" | "banners"
 *   - resourceId: (optional) restaurant_id or banner_id for scoped buckets
 *   - orderId: (optional) order_id for review images
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const bucket = formData.get("bucket") as StorageBucket | null;
    const resourceId = formData.get("resourceId") as string | null;
    const orderId = formData.get("orderId") as string | null;

    // ─── Input validation ──────────────────────────────────────────────
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!bucket || !BUCKET_CONFIG[bucket]) {
      return NextResponse.json(
        { error: "Invalid bucket. Must be one of: avatars, reviews, restaurants, banners" },
        { status: 400 },
      );
    }

    const fileName = file instanceof File ? file.name : "upload";

    // ─── Auth & authorization ──────────────────────────────────────────
    let userId: string;
    let pathSegments: string[];

    switch (bucket) {
      case "avatars": {
        const { user } = await requireUser();
        userId = user.id;
        pathSegments = [userId];
        break;
      }
      case "reviews": {
        const { user } = await requireUser();
        userId = user.id;
        if (!orderId) {
          return NextResponse.json({ error: "orderId is required for review uploads" }, { status: 400 });
        }
        pathSegments = [userId, orderId];
        break;
      }
      case "restaurants": {
        const { user, supabase } = await requireUser();
        userId = user.id;
        if (!resourceId) {
          return NextResponse.json({ error: "resourceId (restaurant_id) is required" }, { status: 400 });
        }
        // Verify ownership or admin — reuses Phase 4 requireOwnership
        await requireOwnership(supabase, "restaurants", resourceId, "owner_id", userId);
        pathSegments = [resourceId];
        break;
      }
      case "banners": {
        const { user } = await requireRole("admin");
        userId = user.id;
        if (!resourceId) {
          return NextResponse.json({ error: "resourceId (banner_id) is required" }, { status: 400 });
        }
        pathSegments = [resourceId];
        break;
      }
    }

    // ─── Server-side validation (magic bytes) ──────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    let sniffedMime: string;
    try {
      sniffedMime = validateFileServer(arrayBuffer, fileName, bucket);
    } catch (err) {
      const message = err instanceof Error ? err.message : "File validation failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // ─── Upload via service role (bypasses storage RLS) ────────────────
    const storagePath = buildStoragePath(bucket, pathSegments, fileName);
    const admin = getAdminSupabase();

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(storagePath, arrayBuffer, {
        contentType: sniffedMime,
        upsert: false,
      });

    if (uploadError) {
      logServerError("storage.upload_failed", uploadError, { bucket });
      return NextResponse.json(
        { error: "Upload failed. Please try again." },
        { status: 500 },
      );
    }

    // ─── Build public URL ──────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const publicUrl = getPublicUrl(supabaseUrl, bucket, storagePath);

    return NextResponse.json({
      path: storagePath,
      publicUrl,
      bucket,
      sniffedMime,
    });
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;

    logServerError("storage.upload_unexpected_error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Disable Next.js body parser — we handle multipart/form-data ourselves.
export const runtime = "nodejs";

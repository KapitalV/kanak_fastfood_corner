import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

// ─── AuthError ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 = 401,
    public readonly code: string = "UNAUTHENTICATED",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ─── Return types ────────────────────────────────────────────────────────────

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
}

export interface RoleContext extends AuthContext {
  role: UserRole;
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

/**
 * Require an authenticated user from the server session.
 * Identity is read from the Supabase auth cookie — never from headers, body
 * fields, or NEXT_PUBLIC_ values.
 *
 * @throws {AuthError} 401 if not authenticated.
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AuthError("Authentication required", 401, "UNAUTHENTICATED");
  }
  return { user, supabase };
}

/**
 * Require an authenticated user with one of the specified roles.
 * The role is read from the database `profiles` table via the user's own
 * session (RLS-enforced) — never from a client-provided field.
 *
 * @throws {AuthError} 401 if not authenticated.
 * @throws {AuthError} 403 if the account is inactive or the role doesn't match.
 */
export async function requireRole(...roles: UserRole[]): Promise<RoleContext> {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_active === false) {
    throw new AuthError("Account is not active", 403, "ACCOUNT_INACTIVE");
  }

  const userRole = profile.role as UserRole;
  if (!roles.includes(userRole)) {
    throw new AuthError("Insufficient permissions", 403, "FORBIDDEN");
  }

  return { user, supabase, role: userRole };
}

/**
 * Verify that a resource belongs to the specified user via a database
 * predicate (not an in-code if-statement). RLS remains the backstop;
 * this provides clear error messages at the application level.
 *
 * @throws {AuthError} 403 if the resource is not found or the ownership
 *   column doesn't match the user.
 */
export async function requireOwnership(
  client: SupabaseClient,
  table: string,
  resourceId: string,
  ownerColumn: string,
  userId: string,
): Promise<void> {
  const { data } = await client
    .from(table)
    .select("id")
    .eq("id", resourceId)
    .eq(ownerColumn, userId)
    .maybeSingle();

  if (!data) {
    throw new AuthError(
      "Resource not found or access denied",
      403,
      "OWNERSHIP_DENIED",
    );
  }
}

// ─── Error handler ───────────────────────────────────────────────────────────

/**
 * Convert an AuthError into a NextResponse. Returns `null` for non-auth
 * errors so the caller can fall through to generic error handling.
 */
export function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return null;
}

// ─── Request guards ──────────────────────────────────────────────────────────

const DEFAULT_BODY_LIMIT = 512 * 1024; // 512 KB

/**
 * Reject requests whose Content-Length exceeds the limit.
 * Returns `null` if the body is within limits (caller should proceed).
 */
export function enforceBodyLimit(
  request: Request,
  maxBytes = DEFAULT_BODY_LIMIT,
): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  }
  return null;
}

// ─── Timeout handling ────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 25_000; // 25 s — inside Vercel's 30 s limit

/**
 * Race a handler promise against a timeout.
 * Returns a 504 Gateway Timeout response if the deadline is exceeded.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T | NextResponse> {
  const timeout = new Promise<NextResponse>((resolve) => {
    setTimeout(
      () =>
        resolve(
          NextResponse.json(
            { error: "Request timed out" },
            { status: 504 },
          ),
        ),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeout]);
}

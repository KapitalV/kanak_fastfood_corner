"use client";

import { useAuthProfile } from "./use-auth-profile";
import type { Role } from "@/lib/types";
import { LinkButton } from "./ui";

export function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { data, isLoading } = useAuthProfile();

  if (isLoading) {
    return <p className="text-sm text-zinc-600">Checking access...</p>;
  }

  if (!data?.user) {
    return (
      <div className="rounded-lg bg-white p-6 ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-950">Login required</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in to continue to this workspace.
        </p>
        <LinkButton href="/auth" className="mt-5">
          Login
        </LinkButton>
      </div>
    );
  }

  if (!data.profile || !allow.includes(data.profile.role)) {
    return (
      <div className="rounded-lg bg-white p-6 ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-950">No access</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This page is for {allow.join(" or ")} users.
        </p>
      </div>
    );
  }

  return children;
}

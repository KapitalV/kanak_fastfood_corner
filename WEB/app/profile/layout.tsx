import type { Metadata } from "next";
import { ProfileNav } from "./profile-nav";

export const metadata: Metadata = {
  title: "My Profile",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-black text-stone-900">My Account</h1>
      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 md:w-64">
          <ProfileNav />
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}

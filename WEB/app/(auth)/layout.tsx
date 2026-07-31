import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center py-8">
      <div className="w-full max-w-md animate-fade-up">{children}</div>
    </div>
  );
}

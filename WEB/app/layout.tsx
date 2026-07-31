import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-nav";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Kanak Foods — Fresh Local Delivery",
    template: "%s | Kanak Foods",
  },
  description:
    "Order hot meals from trusted local restaurants. Fast delivery, live tracking, and the best food in your area.",
  manifest: "/manifest.json",
  applicationName: "Kanak Foods",
  category: "food",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  keywords: ["food delivery", "online food order", "local restaurants", "kanak foods"],
  openGraph: {
    type: "website",
    siteName: "Kanak Foods",
    title: "Kanak Foods — Fresh Local Delivery",
    description:
      "Order hot meals from trusted local restaurants. Fast delivery, live tracking.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kanak Foods",
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--bg)]">
        <Providers>
          <ServiceWorkerRegistration />
          <Header />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
            {children}
          </main>
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}

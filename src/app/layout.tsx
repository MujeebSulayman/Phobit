import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "usedebit.app",
  description: "Launch coins on pump.fun. Creator fees land on your Apple Pay card.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          <div className="min-h-screen">
            <Suspense fallback={<aside className="hidden lg:block fixed inset-y-0 left-0 w-[240px] border-r border-line bg-bg" />}>
              <Sidebar />
            </Suspense>
            <div className="lg:pl-[240px]">
              <Suspense fallback={<header className="sticky top-0 z-30 h-16 border-b border-line bg-bg/70 backdrop-blur-2xl" />}>
                <Topbar />
              </Suspense>
              <main className="mx-auto w-full max-w-[1200px] px-5 pb-28 pt-10 lg:px-10 lg:pb-20">{children}</main>
            </div>
            <Suspense fallback={null}>
              <MobileNav />
            </Suspense>
          </div>
        </Providers>
      </body>
    </html>
  );
}

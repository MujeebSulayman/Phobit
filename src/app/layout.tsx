import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Background } from "@/components/fx/Background";
import { LiquidGlass } from "@/components/fx/LiquidGlass";
import { Footer } from "@/components/layout/Footer";
import { MobileDock } from "@/components/layout/MobileDock";
import { Nav } from "@/components/layout/GlassNav";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Phobit — fees, routed to a phone number", template: "%s · Phobit" },
  description: "Launch a coin on pump.fun and name a phone number. Every creator fee lands in that person's own wallet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05060a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          <Background />
          <LiquidGlass />
          <Nav />
          <main className="relative mx-auto w-full max-w-[1240px] px-5 pb-10 pt-28 sm:pt-32 lg:px-10">{children}</main>
          <Footer />
          <MobileDock />
        </Providers>
      </body>
    </html>
  );
}

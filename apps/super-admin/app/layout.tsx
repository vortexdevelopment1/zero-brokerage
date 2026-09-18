import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/ToastContainer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "VortexCubes Super Admin",
  description: "Asset Network V4.0 — Real Estate & Commercial Ecosystem Super Admin Command Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-ink-800 antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}

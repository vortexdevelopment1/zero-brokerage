import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { ThemeInitializer } from "@/components/layout/ThemeInitializer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "VortexCubes Super Admin",
  description: "Asset Network V4.0 — Real Estate & Commercial Ecosystem Super Admin Command Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('themeMode') || 'auto';
                  var isDark = false;
                  if (mode === 'dark') {
                    isDark = true;
                  } else if (mode === 'light') {
                    isDark = false;
                  } else {
                    var now = new Date();
                    var mins = now.getHours() * 60 + now.getMinutes();
                    // Day: 06:00 (360) to 18:00 (1080)
                    isDark = mins < 360 || mins >= 1080;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans text-ink-800 antialiased dark:text-ink-100">
        <ThemeInitializer />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}

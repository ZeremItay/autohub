import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Layout from "./components/Layout";
import AccessibilityWidget from "./components/AccessibilityWidget";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Custom Hebrew font - Jabutinski
const customHebrewFont = localFont({
  src: [
    {
      path: "./fonts/Font Jabutinski/Light/FbJabutinski-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Font Jabutinski/Bold/FbJabutinski-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-hebrew",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מועדון האוטומטורים",
  description: "קהילת מומחי האוטומציה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'light' || theme === 'neon') {
                    document.documentElement.classList.add('theme-' + theme);
                    document.body.classList.add('theme-' + theme);
                  } else {
                    document.documentElement.classList.add('theme-neon');
                    document.body.classList.add('theme-neon');
                  }
                } catch (e) {
                  document.documentElement.classList.add('theme-neon');
                  document.body.classList.add('theme-neon');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${customHebrewFont.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {/* Skip to Content Link - Accessibility (WCAG 2.1 AA) */}
          <a href="#main-content" className="skip-to-content">
            דלג לתוכן הראשי
          </a>
          <Layout>{children}</Layout>
          {/* Accessibility Widget - Floating on all pages */}
          <AccessibilityWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}

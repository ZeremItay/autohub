import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Layout from "./components/Layout";

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
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${customHebrewFont.variable} antialiased`}
        suppressHydrationWarning
      >
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}

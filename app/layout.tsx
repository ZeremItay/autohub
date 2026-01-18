import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  title: {
    default: "מועדון האוטומטורים",
    template: "%s | מועדון האוטומטורים"
  },
  description: "קהילת מומחי האוטומציה - לומדים, משתפים ומתפתחים יחד. קורסים, הדרכות, פורומים וכלים לאוטומציה No Code ובינה מלאכותית",
  keywords: ["אוטומציה", "no code", "make.com", "airtable", "בינה מלאכותית", "AI", "אוטומציות", "קהילה", "קורסים", "הדרכות", "פורומים"],
  authors: [{ name: "מועדון האוטומטורים" }],
  creator: "מועדון האוטומטורים",
  publisher: "מועדון האוטומטורים",
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "מועדון האוטומטורים",
    title: "מועדון האוטומטורים",
    description: "קהילת מומחי האוטומציה - לומדים, משתפים ומתפתחים יחד",
  },
  twitter: {
    card: "summary_large_image",
    title: "מועדון האוטומטורים",
    description: "קהילת מומחי האוטומציה - לומדים, משתפים ומתפתחים יחד",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://autohub.com'),
  icons: {
    icon: '/CLUB-FAVICON.ico',
    shortcut: '/CLUB-FAVICON.ico',
    apple: '/CLUB-FAVICON.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://autohub.com';
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "מועדון האוטומטורים",
    "description": "קהילת מומחי האוטומציה - לומדים, משתפים ומתפתחים יחד",
    "url": baseUrl,
    "logo": `${baseUrl}/logo.png`,
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["Hebrew"]
    }
  };

  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="icon" href="/CLUB-FAVICON.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/CLUB-FAVICON.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/CLUB-FAVICON.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${customHebrewFont.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* WCAG 2.4.1: Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#F52F8E] focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:ring-offset-2"
        >
          דלג לתוכן הראשי
        </a>
        <Layout>{children}</Layout>
        <SpeedInsights />
      </body>
    </html>
  );
}

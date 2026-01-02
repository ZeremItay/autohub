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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${customHebrewFont.variable} antialiased`}
        suppressHydrationWarning
      >
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}

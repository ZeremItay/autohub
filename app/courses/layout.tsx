import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'קורסים',
  description: 'למד אוטומציות ו-AI בקצב שלך. קורסים מקצועיים ב-Make.com, Airtable, בינה מלאכותית, בוטים ועוד. קורסים למתחילים ומתקדמים עם תמיכה מלאה',
  openGraph: {
    title: 'קורסים | מועדון האוטומטורים',
    description: 'למד אוטומציות ו-AI בקצב שלך. קורסים מקצועיים ב-Make.com, Airtable, בינה מלאכותית, בוטים ועוד',
    type: 'website',
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


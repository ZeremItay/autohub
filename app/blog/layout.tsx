import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'בלוג',
  description: 'מאמרים, מדריכים וטיפים מהקהילה. למד על אוטומציות, No Code, בינה מלאכותית, סיפורי הצלחה, ראיונות עם מומחים ועוד',
  openGraph: {
    title: 'בלוג | מועדון האוטומטורים',
    description: 'מאמרים, מדריכים וטיפים מהקהילה. למד על אוטומציות, No Code, בינה מלאכותית, סיפורי הצלחה ועוד',
    type: 'website',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פורומים',
  description: 'קהילה מקצועית שעוזרת בסיוע, בתמיכה, מציאת פתרונות ועזרה בכל מה שקשור לאוטומציות No Code ובינה מלאכותית. שאל שאלות, שתף ידע והתחבר עם המומחים',
  openGraph: {
    title: 'פורומים | מועדון האוטומטורים',
    description: 'קהילה מקצועית שעוזרת בסיוע, בתמיכה, מציאת פתרונות ועזרה בכל מה שקשור לאוטומציות No Code ובינה מלאכותית',
    type: 'website',
  },
};

export default function ForumsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


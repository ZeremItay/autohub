import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'חברים',
  description: 'גלה את כל החברים בקהילת מועדון האוטומטורים. צפה בפרופילים, נקודות, דירוגים ופעילות חברי הקהילה. מצא חברים חדשים והתחבר עם מומחי אוטומציה',
  openGraph: {
    title: 'חברים | מועדון האוטומטורים',
    description: 'גלה את כל החברים בקהילת מועדון האוטומטורים. צפה בפרופילים, נקודות, דירוגים ופעילות חברי הקהילה',
    type: 'website',
  },
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'הקלטות',
  description: 'צפה בהקלטות מלייבים, וובינרים ומפגשי קהילה. למד מאוטומציות, No Code, בינה מלאכותית ועוד. הקלטות מקצועיות עם תוכן איכותי',
  openGraph: {
    title: 'הקלטות | מועדון האוטומטורים',
    description: 'צפה בהקלטות מלייבים, וובינרים ומפגשי קהילה. למד מאוטומציות, No Code, בינה מלאכותית ועוד',
    type: 'website',
  },
};

export default function RecordingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


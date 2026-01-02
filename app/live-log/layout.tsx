import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'יומן לייבים',
  description: 'צפה בלוח זמנים של כל הלייבים, הוובינרים והאירועים הקרובים. הירשם לאירועים, קבל תזכורות וצפה בהקלטות של אירועים קודמים',
  openGraph: {
    title: 'יומן לייבים | מועדון האוטומטורים',
    description: 'צפה בלוח זמנים של כל הלייבים, הוובינרים והאירועים הקרובים. הירשם לאירועים וצפה בהקלטות',
    type: 'website',
  },
};

export default function LiveLogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


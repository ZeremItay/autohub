import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פידבקים',
  description: 'שתף את המחשבות שלך על מועדון האוטומטורים. שלח פידבק, הצעות לשיפור, דיווח על בעיות או סתם ספר לנו מה אתה חושב',
  openGraph: {
    title: 'פידבקים | מועדון האוטומטורים',
    description: 'שתף את המחשבות שלך על מועדון האוטומטורים. שלח פידבק, הצעות לשיפור, דיווח על בעיות או סתם ספר לנו מה אתה חושב',
    type: 'website',
  },
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פרויקטים',
  description: 'גלה פרויקטי אוטומציה מעולים מהקהילה. שתף את הפרויקטים שלך, למד מאחרים וקבל השראה לפרויקטים הבאים שלך',
  openGraph: {
    title: 'פרויקטים | מועדון האוטומטורים',
    description: 'גלה פרויקטי אוטומציה מעולים מהקהילה. שתף את הפרויקטים שלך, למד מאחרים וקבל השראה',
    type: 'website',
  },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


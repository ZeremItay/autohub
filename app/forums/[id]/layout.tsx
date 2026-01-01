import { Metadata } from 'next';
import { getForumById } from '@/lib/queries/forums';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const { data: forum } = await getForumById(id);
    
    if (!forum) {
      return {
        title: 'פורום לא נמצא | מועדון האוטומטורים',
        description: 'הפורום המבוקש לא נמצא',
      };
    }

    return {
      title: `${forum.name} | מועדון האוטומטורים`,
      description: forum.description || `פורום ${forum.name} - דיונים ושאלות`,
      openGraph: {
        title: forum.name,
        description: forum.description || `פורום ${forum.name}`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'פורום | מועדון האוטומטורים',
      description: 'פורומים ודיונים',
    };
  }
}

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


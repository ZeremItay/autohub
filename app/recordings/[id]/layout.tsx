import { Metadata } from 'next';
import { getRecordingById } from '@/lib/queries/recordings';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { data: recording } = await getRecordingById(params.id);
    
    if (!recording) {
      return {
        title: 'הקלטה לא נמצאה | מועדון האוטומטורים',
        description: 'ההקלטה המבוקשת לא נמצאה',
      };
    }

    return {
      title: `${recording.title} | מועדון האוטומטורים`,
      description: recording.description || `הקלטה: ${recording.title}`,
      openGraph: {
        title: recording.title,
        description: recording.description || `הקלטה: ${recording.title}`,
        type: 'video.other',
      },
    };
  } catch (error) {
    return {
      title: 'הקלטה | מועדון האוטומטורים',
      description: 'הקלטות מקצועיות',
    };
  }
}

export default function RecordingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


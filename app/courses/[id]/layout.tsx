import { Metadata } from 'next';
import { getCourseById } from '@/lib/queries/courses';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const { data: course } = await getCourseById(id);
    
    if (!course) {
      return {
        title: 'קורס לא נמצא | מועדון האוטומטורים',
        description: 'הקורס המבוקש לא נמצא',
      };
    }

    return {
      title: `${course.title} | מועדון האוטומטורים`,
      description: course.description || `קורס ${course.title} - ${course.lessons_count || 0} שיעורים`,
      openGraph: {
        title: course.title,
        description: course.description || `קורס ${course.title}`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'קורס | מועדון האוטומטורים',
      description: 'קורסים מקצועיים לאוטומציה',
    };
  }
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


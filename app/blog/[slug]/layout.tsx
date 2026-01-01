import { Metadata } from 'next';
import { getBlogPostBySlug } from '@/lib/queries/blog';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { data: post } = await getBlogPostBySlug(slug);
    
    if (!post) {
      return {
        title: 'פוסט לא נמצא | מועדון האוטומטורים',
        description: 'הפוסט המבוקש לא נמצא',
      };
    }

    return {
      title: `${post.title} | מועדון האוטומטורים`,
      description: post.excerpt || post.content?.substring(0, 160) || `פוסט: ${post.title}`,
      openGraph: {
        title: post.title,
        description: post.excerpt || post.content?.substring(0, 160) || '',
        type: 'article',
      },
    };
  } catch (error) {
    return {
      title: 'בלוג | מועדון האוטומטורים',
      description: 'מאמרים וטיפים לאוטומציה',
    };
  }
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


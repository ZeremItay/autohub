'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ForumPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const forumId = params.id as string;
  const postId = params.postId as string;
  
  // Redirect to forum page with post selected
  useEffect(() => {
    if (forumId && postId) {
      // Navigate to forum page with postId query parameter - the forum page will handle opening the post
      router.replace(`/forums/${forumId}?postId=${postId}`);
    }
  }, [forumId, postId, router]);
  
  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
        <p className="text-gray-600">מעביר לפורום...</p>
      </div>
    </div>
  );
}

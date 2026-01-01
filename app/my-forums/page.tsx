'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, MessageCircle, Heart, Eye, Pin, Clock } from 'lucide-react';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Link from 'next/link';
import { getUserForumPosts, getUserForumReplies, getUserLikedForumPosts } from '@/lib/queries/forums';
import { getAllProfiles } from '@/lib/queries/profiles';

function MyForumsContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'discussions';
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myReplies, setMyReplies] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, activeTab]);

  async function loadUser() {
    try {
      const { data: profiles } = await getAllProfiles();
      if (Array.isArray(profiles) && profiles.length > 0) {
        const user = profiles[0];
        setCurrentUser({ 
          id: user.user_id || user.id, 
          ...user 
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  // Helper function to clean placeholder images from HTML content
  function cleanPlaceholderImages(content: string): string {
    if (!content || typeof content !== 'string') {
      return content;
    }
    
    // Pattern to match base64 SVG images with "טוען..." (loading placeholder)
    const placeholderPattern = /<img[^>]*src=["']data:image\/svg\+xml;base64,[^"']*טוען[^"']*["'][^>]*>/gi;
    
    // Remove placeholder images
    let cleanedContent = content.replace(placeholderPattern, '');
    
    // Also check for the specific loading SVG pattern we use
    const loadingSvgPattern = /<img[^>]*src=["']data:image\/svg\+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5טוען[^"']*["'][^>]*>/gi;
    cleanedContent = cleanedContent.replace(loadingSvgPattern, '');
    
    return cleanedContent;
  }

  // Helper function to extract plain text from HTML for preview
  function getPlainTextPreview(content: string, maxLength: number = 25): string {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    // First, clean placeholder images
    let cleanedContent = cleanPlaceholderImages(content);
    
    // Create a temporary DOM element to parse HTML and extract text
    // This is more reliable than regex for handling complex HTML
    let plainText = '';
    try {
      // Create a temporary div element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanedContent;
      
      // Extract text content (this automatically handles all HTML entities and tags)
      plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Clean up any remaining whitespace
      plainText = plainText.replace(/\s+/g, ' ').trim();
    } catch (error) {
      // Fallback to regex if DOM parsing fails
      plainText = cleanedContent
        .replace(/<img[^>]*>/gi, '') // Remove all images first
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/&#39;/g, "'") // Replace &#39; with '
        .replace(/&#x27;/g, "'") // Replace &#x27; with '
        .replace(/&#x2F;/g, '/') // Replace &#x2F; with /
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    }
    
    // Check if there are any images in the original content
    const hasImages = /<img[^>]*>/gi.test(cleanedContent);
    
    // Take first maxLength characters and add ... if longer or if there are images
    if (plainText.length > maxLength) {
      return plainText.substring(0, maxLength) + '...';
    } else if (hasImages && plainText.length > 0) {
      return plainText + '...';
    }
    
    return plainText;
  }

  async function loadData() {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      if (activeTab === 'discussions') {
        const { data } = await getUserForumPosts(currentUser.id);
        setMyPosts(data || []);
      } else if (activeTab === 'replies') {
        const { data } = await getUserForumReplies(currentUser.id);
        setMyReplies(data || []);
      } else if (activeTab === 'favorites') {
        const { data } = await getUserLikedForumPosts(currentUser.id);
        setMyFavorites(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return date.toLocaleDateString('he-IL');
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">הפורומים שלי</h1>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 inline-flex gap-2">
          <Link
            href="/my-forums?tab=discussions"
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'discussions'
                ? 'bg-hot-pink text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            הדיונים שלי
          </Link>
          <Link
            href="/my-forums?tab=replies"
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'replies'
                ? 'bg-hot-pink text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            התגובות שלי
          </Link>
          <Link
            href="/my-forums?tab=favorites"
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-hot-pink text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            המועדפים שלי
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'discussions' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">הדיונים שלי</h2>
              {myPosts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>עדיין לא פרסמת דיונים</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myPosts.map((post: any) => (
                    <Link
                      key={post.id}
                      href={`/forums/${post.forum_id}/posts/${post.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {post.is_pinned && (
                              <Pin className="w-4 h-4 text-[#F52F8E]" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-800">{post.title}</h3>
                          </div>
                          <div 
                            className="text-gray-600 text-sm mb-3 line-clamp-2"
                            dir="rtl"
                          >
                            {getPlainTextPreview(post.content || '', 100)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>בפורום: {post.forums?.display_name || post.forums?.name}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(post.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.replies_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{post.views}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'replies' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">התגובות שלי</h2>
              {myReplies.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>עדיין לא הגבת על דיונים</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myReplies.map((reply: any) => (
                    <Link
                      key={reply.id}
                      href={`/forums/${reply.forum_posts?.forum_id}/posts/${reply.post_id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {reply.forum_posts?.title || 'פוסט'}
                          </h3>
                          <div 
                            className="text-gray-600 text-sm mb-3 line-clamp-2"
                            dir="rtl"
                          >
                            {getPlainTextPreview(reply.content || '', 100)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>בפורום: {reply.forum_posts?.forums?.display_name || reply.forum_posts?.forums?.name}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(reply.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">המועדפים שלי</h2>
              {myFavorites.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>עדיין לא אהבת דיונים</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myFavorites.map((post: any) => (
                    <Link
                      key={post.id}
                      href={`/forums/${post.forum_id}/posts/${post.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {post.is_pinned && (
                              <Pin className="w-4 h-4 text-[#F52F8E]" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-800">{post.title}</h3>
                          </div>
                          <div 
                            className="text-gray-600 text-sm mb-3 line-clamp-2"
                            dir="rtl"
                          >
                            {getPlainTextPreview(post.content || '', 100)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>בפורום: {post.forums?.display_name || post.forums?.name}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(post.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.replies_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{post.views}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyForumsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MyForumsContent />
    </Suspense>
  );
}


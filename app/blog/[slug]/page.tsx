'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, ArrowRight, Heart, Share2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { getBlogPostBySlug, incrementBlogPostViews } from '@/lib/queries/blog';
import { getBlogComments, createBlogComment, deleteBlogComment, type BlogComment } from '@/lib/queries/blog-comments';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { CommentsList } from '@/app/components/comments';

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user: currentUser } = useCurrentUser();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug]);

  async function loadPost() {
    setLoading(true);
    try {
      const { data } = await getBlogPostBySlug(slug);
      if (data) {
        setPost(data);
        // Increment views
        await incrementBlogPostViews(data.id);
        // Load comments
        await loadComments(data.id);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadComments(blogPostId: string) {
    try {
      const { data, error } = await getBlogComments(blogPostId);
      if (!error && data) {
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function handleSubmitComment(text: string) {
    if (!text.trim() || !currentUser || !post) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        return;
      }
      
      const { data, error } = await createBlogComment(
        post.id,
        userId,
        text
      );
      
      if (!error && data) {
        await loadComments(post.id);
      } else {
        alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
    }
  }

  async function handleSubmitReply(commentId: string, text: string) {
    if (!text.trim() || !currentUser || !post) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        return;
      }
      
      const { data, error } = await createBlogComment(
        post.id,
        userId,
        text,
        commentId
      );
      
      if (!error && data) {
        await loadComments(post.id);
      } else {
        alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) return;
    
    try {
      const { error } = await deleteBlogComment(commentId);
      if (!error && post) {
        await loadComments(post.id);
      } else {
        alert('שגיאה במחיקת התגובה. אנא נסה שוב.');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('שגיאה במחיקת התגובה. אנא נסה שוב.');
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">מאמר לא נמצא</h1>
          <Link href="/blog" className="text-[#F52F8E] hover:underline">
            חזור לבלוג
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[#F52F8E] hover:underline mb-6"
        >
          <ArrowRight className="w-5 h-5" />
          <span>חזור לבלוג</span>
        </Link>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded mb-4">
            {post.category}
          </span>
          {post.is_featured && (
            <span className="inline-block px-3 py-1 bg-[#F52F8E] text-white text-sm rounded mr-2 mb-4">
              מומלץ
            </span>
          )}
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{post.title}</h1>
          
          {post.excerpt && (
            <p className="text-xl text-gray-600 mb-6">{post.excerpt}</p>
          )}

          {/* Author and Meta */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              {post.profile && (
                <div className="flex items-center gap-3">
                  {post.profile.avatar_url ? (
                    <img
                      src={post.profile.avatar_url}
                      alt={post.profile.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white text-lg">
                      {post.profile.display_name?.charAt(0) || 'א'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{post.profile.display_name || 'מחבר'}</p>
                    <p className="text-sm text-gray-500">מחבר</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.read_time_minutes || 5} דקות קריאה</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>{post.likes_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Share Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">שתף מאמר:</span>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.excerpt,
                    url: window.location.href
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('הקישור הועתק ללוח');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>שתף</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="w-6 h-6 text-[#F52F8E]" />
              <h2 className="text-2xl font-bold text-gray-800">תגובות ({comments.length})</h2>
            </div>

            <CommentsList
              comments={comments}
              currentUser={currentUser}
              onSubmitComment={handleSubmitComment}
              onSubmitReply={handleSubmitReply}
              onDeleteComment={handleDeleteComment}
              emptyMessage="אין תגובות עדיין. היה הראשון להגיב!"
              showForm={true}
            />
          </div>
        </div>

        {/* Back to Blog */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[#F52F8E] hover:underline font-medium"
          >
            <ArrowRight className="w-5 h-5" />
            <span>חזור לכל המאמרים</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


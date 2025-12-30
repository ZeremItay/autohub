'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Heart, MessageCircle, Eye, Clock, Calendar, Lock, Unlock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { getForumPostById, toggleForumPostLike, deleteForumPostReply } from '@/lib/queries/forums';
import { getAllProfiles } from '@/lib/queries/profiles';
import CommentsList from '@/app/components/comments/CommentsList';
import { adaptForumRepliesToComments } from '@/lib/utils/forum-comments-adapter';

export default function ForumPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const forumId = params.id as string;
  const postId = params.postId as string;
  
  const [post, setPost] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) {
      loadCurrentUser();
    }
  }, [postId]);

  useEffect(() => {
    if (postId && currentUser) {
      loadPost();
    }
  }, [postId, currentUser]);

  // Listen for profile updates to reload post and comments
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (postId && currentUser) {
        loadPost();
        loadCurrentUser();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [postId, currentUser]);


  async function loadCurrentUser() {
    try {
      const { data: profiles } = await getAllProfiles();
      if (Array.isArray(profiles) && profiles.length > 0) {
        // Try to get user from localStorage first
        const selectedUserId = typeof window !== 'undefined' ? localStorage.getItem('selectedUserId') : null;
        let user = profiles[0];
        
        if (selectedUserId && Array.isArray(profiles)) {
          const foundUser = profiles.find((p: any) => (p.user_id || p.id) === selectedUserId);
          if (foundUser) {
            user = foundUser;
          }
        }
        
        setCurrentUser({ 
          id: user.user_id || user.id, 
          ...user 
        });
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  async function loadPost() {
    setLoading(true);
    try {
      const { data, error } = await getForumPostById(postId, currentUser?.id);
      if (!error && data) {
        setPost(data);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    if (!currentUser || !post) return;
    
    try {
      const { data, error } = await toggleForumPostLike(post.id, currentUser.id);
      if (!error && data) {
        // Reload post to get updated likes count
        await loadPost();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
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

      const postId = typeof post.id === 'string' ? post.id : String(post.id);
      const userIdString = typeof userId === 'string' ? userId : String(userId);

      const response = await fetch('/api/forums/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          user_id: userIdString,
          content: text.trim(),
          parent_id: null
        })
      });

      const result = await response.json();

      if (response.ok) {
        await loadPost();
      } else {
        alert(`שגיאה ביצירת התגובה: ${result.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
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

      const postId = typeof post.id === 'string' ? post.id : String(post.id);
      const userIdString = typeof userId === 'string' ? userId : String(userId);

      const response = await fetch('/api/forums/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          user_id: userIdString,
          content: text.trim(),
          parent_id: commentId
        })
      });

      const result = await response.json();

      if (response.ok) {
        await loadPost();
      } else {
        alert(`שגיאה ביצירת התגובה: ${result.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) return;
    
    try {
      const { error } = await deleteForumPostReply(commentId);
      if (!error) {
        await loadPost();
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  }

  async function handleToggleLock() {
    if (!currentUser || !post) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      const response = await fetch(`/api/forums/posts/${post.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();
      if (response.ok) {
        await loadPost();
      } else {
        alert(result.error || 'שגיאה בסגירת/פתיחת הפוסט');
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
      alert('שגיאה בסגירת/פתיחת הפוסט');
    }
  }

  async function handleMarkAsAnswer(replyId: string, mark: boolean) {
    if (!currentUser || !post) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      const response = await fetch(`/api/forums/replies/${replyId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          post_id: post.id, 
          user_id: userId,
          mark: mark 
        })
      });

      const result = await response.json();
      if (response.ok) {
        await loadPost();
      } else {
        alert(result.error || 'שגיאה בסימון התגובה');
      }
    } catch (error) {
      console.error('Error marking as answer:', error);
      alert('שגיאה בסימון התגובה');
    }
  }

  async function handleDeletePost() {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפוסט? פעולה זו לא ניתנת לביטול.')) return;
    
    try {
      const response = await fetch(`/api/forums/posts/${post.id}/delete`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (response.ok) {
        router.push(`/forums/${forumId}`);
      } else {
        alert(result.error || 'שגיאה במחיקת הפוסט');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('שגיאה במחיקת הפוסט');
    }
  }

  function isAdmin(): boolean {
    if (!currentUser) return false;
    const role = currentUser.roles || currentUser.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    return roleName === 'admin';
  }

  function isPostOwner(): boolean {
    if (!currentUser || !post) return false;
    const userId = currentUser.user_id || currentUser.id;
    return post.user_id === userId;
  }


  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
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
          <p className="text-gray-500 text-lg">פוסט לא נמצא</p>
          <Link href={`/forums/${forumId}`} className="text-[#F52F8E] hover:underline mt-4 inline-block">
            חזור לפורום
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push(`/forums/${forumId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-[#F52F8E] mb-6 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>חזור לפורום</span>
          </button>

          {/* Post Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            {/* Author Info */}
            <div className="flex items-center gap-4 mb-4">
              {post.profile?.avatar_url ? (
                <img
                  src={post.profile.avatar_url}
                  alt={post.profile.display_name || 'משתמש'}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  key={`post-${post.id}`}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-semibold">
                  {(post.profile?.display_name || 'מ').charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-800">{post.profile?.display_name || 'משתמש'}</h3>
                <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
              </div>
            </div>

            {/* Post Title */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{post.title}</h1>

            {/* Post Content */}
            <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-6">
              {post.content}
            </div>

            {/* Media */}
            {post.media_url && (
              <div className="mb-6">
                {post.media_type === 'image' ? (
                  <img 
                    src={post.media_url} 
                    alt="Post media" 
                    className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
                  />
                ) : post.media_type === 'video' ? (
                  <video 
                    src={post.media_url} 
                    controls 
                    className="w-full max-h-96 rounded-lg border border-gray-200"
                  />
                ) : null}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleLike}
                disabled={!currentUser}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  post.user_liked
                    ? 'bg-[#F52F8E] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Heart className={`w-5 h-5 ${post.user_liked ? 'fill-current' : ''}`} />
                <span>{post.likes_count || 0}</span>
              </button>
              
              <div className="flex items-center gap-2 text-gray-600">
                <MessageCircle className="w-5 h-5" />
                <span>{post.replies_count || 0} תגובות</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Eye className="w-5 h-5" />
                <span>{post.views || 0} צפיות</span>
              </div>
            </div>
          </div>

          {/* Replies Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <CommentsList
              comments={adaptForumRepliesToComments(post.replies || [])}
              currentUser={currentUser}
              onSubmitComment={handleSubmitComment}
              onSubmitReply={handleSubmitReply}
              onDeleteComment={handleDeleteComment}
              emptyMessage="אין תגובות עדיין. היה הראשון להגיב!"
              showForm={!post.is_locked}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


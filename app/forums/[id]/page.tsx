'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, Eye, Pin, Lock, Edit, Image, Video, X, Smile, Code, Link as LinkIcon, Italic, Bold, ArrowRight, Heart } from 'lucide-react';
import Link from 'next/link';
import { getForumById, getForumPosts, getAllForums, getForumPostById, deleteForumPostReply, toggleForumPostLike, type Forum, type ForumPost } from '@/lib/queries/forums';
import { getAllProfiles } from '@/lib/queries/profiles';
import AuthGuard from '@/app/components/AuthGuard';
import dynamic from 'next/dynamic';
import CommentsList from '@/app/components/comments/CommentsList';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

// Lazy load RichTextEditor (heavy component)
const RichTextEditor = dynamic(
  () => import('@/app/components/RichTextEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-32 bg-gray-100 rounded animate-pulse" />
  }
);
import { adaptForumRepliesToComments } from '@/lib/utils/forum-comments-adapter';

export default function ForumDetailPage() {
  return (
    <AuthGuard requireAuth={true} fallbackMessage="עליך להתחבר לאתר כדי לצפות בתוכן">
      <ForumDetailPageContent />
    </AuthGuard>
  );
}

function ForumDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forumId = params.id as string;
  
  const [forum, setForum] = useState<Forum | null>(null);
  const [allForums, setAllForums] = useState<Forum[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postReplies, setPostReplies] = useState<any[]>([]);
  const [loadingPost, setLoadingPost] = useState(false);
  const [deletingPostIds, setDeletingPostIds] = useState<Set<string>>(new Set());
  const { isAdmin, loading: userLoading } = useCurrentUser();

  // Ref to prevent parallel calls to loadPosts
  const isLoadingPostsRef = useRef(false);

  // Memoize load functions to prevent unnecessary re-renders and race conditions
  const loadCurrentUser = useCallback(async () => {
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
  }, []);

  const loadForum = useCallback(async () => {
    if (!forumId) return;
    try {
      const { data, error } = await getForumById(forumId);
      if (!error && data) {
        setForum(data);
      }
    } catch (error) {
      console.error('Error loading forum:', error);
    }
  }, [forumId]);

  const loadAllForums = useCallback(async () => {
    try {
      const { data, error } = await getAllForums();
      if (!error && data) {
        setAllForums(data);
      }
    } catch (error) {
      console.error('Error loading all forums:', error);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    if (!forumId) return;
    
    // Prevent parallel calls
    if (isLoadingPostsRef.current) {
      console.log('loadPosts already running, skipping...');
      return;
    }
    
    isLoadingPostsRef.current = true;
    setLoading(true);
    
    // Add timeout to prevent hanging (Chrome-specific issue)
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      console.warn('loadPosts taking too long, stopping loading state');
      setLoading(false);
      isLoadingPostsRef.current = false; // CRITICAL: Reset ref on timeout
    }, 20000); // 20 seconds timeout
    
    try {
      const { data, error } = await getForumPosts(forumId);
      if (!error && data) {
        setPosts(data);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
      isLoadingPostsRef.current = false;
    }
  }, [forumId]);

  useEffect(() => {
    if (!forumId) return;
    
    let cancelled = false;
    
    // Helper function to add timeout to promises
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };
    
    // Load all data in parallel with individual timeouts
    // Use Promise.allSettled so one failure doesn't block others
    Promise.allSettled([
      withTimeout(loadForum(), 8000, 'loadForum').catch(err => {
        if (!cancelled) console.error('loadForum failed:', err);
      }),
      withTimeout(loadPosts(), 8000, 'loadPosts').catch(err => {
        if (!cancelled) console.error('loadPosts failed:', err);
      }),
      withTimeout(loadCurrentUser(), 8000, 'loadCurrentUser').catch(err => {
        if (!cancelled) console.error('loadCurrentUser failed:', err);
      }),
      withTimeout(loadAllForums(), 8000, 'loadAllForums').catch(err => {
        if (!cancelled) console.error('loadAllForums failed:', err);
      })
    ]).catch(error => {
      if (!cancelled) {
        console.error('Error loading forum data:', error);
      }
    });
    
    return () => {
      cancelled = true;
    };
  }, [forumId, loadForum, loadPosts, loadCurrentUser, loadAllForums]);

  // Check if there's a postId in the URL (from redirect from /posts/[postId] page)
  useEffect(() => {
    const postIdFromUrl = searchParams?.get('postId');
    if (postIdFromUrl && posts.length > 0 && !selectedPost) {
      const postToOpen = posts.find(p => p.id === postIdFromUrl);
      if (postToOpen) {
        handlePostClick(postToOpen);
        // Clean up URL
        router.replace(`/forums/${forumId}`, { scroll: false });
      }
    }
  }, [searchParams, posts, selectedPost, forumId, router]);

  // Listen for profile updates to reload posts and comments
  useEffect(() => {
    if (!forumId) return;
    
    const handleProfileUpdate = () => {
      loadPosts();
      loadCurrentUser();
      if (selectedPost) {
        // Reload selected post to update avatars
        const { getForumPostById } = require('@/lib/queries/forums');
        getForumPostById(selectedPost.id, currentUser?.id).then(({ data, error }: any) => {
          if (!error && data) {
            setSelectedPost(data);
            setPostReplies(data.replies || []);
          }
        });
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [forumId, selectedPost, currentUser, loadPosts, loadCurrentUser]);

  async function handleCreatePost() {
    // Check if content is empty (strip HTML tags for validation)
    const textContent = newPostContent.replace(/<[^>]*>/g, '').trim();
    if (!newPostTitle.trim() || !textContent) {
      alert('אנא מלא את כל השדות');
      return;
    }
    
    if (!currentUser) {
      alert('לא נמצא משתמש מחובר. אנא רענן את הדף.');
      console.error('Current user is null');
      return;
    }
    
    // Make sure we use the correct user_id
    const userId = currentUser.user_id || currentUser.id;
    if (!userId) {
      alert('שגיאה: לא נמצא משתמש מחובר');
      return;
    }
    
    console.log('Creating post with:', {
      forum_id: forumId,
      user_id: userId,
      title: newPostTitle,
      content: newPostContent,
      media_url: mediaUrl,
      media_type: mediaType
    });
    
    try {
      const response = await fetch('/api/forums/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forum_id: forumId,
          user_id: userId,
          title: newPostTitle,
          content: newPostContent,
          media_url: mediaUrl || null,
          media_type: mediaType || null
        })
      });
      
      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (!response.ok) {
        console.error('API returned error status:', response.status);
        console.error('Error response:', result);
        const errorMessage = result.error || result.message || result.details || result.hint || 'שגיאה לא ידועה';
        alert(`שגיאה ביצירת הפוסט: ${errorMessage}`);
        return;
      }
      
      if (response.ok && result.data) {
        // If the API returned the post with profile, add it immediately to the list
        // Otherwise, reload posts to get the updated list
        if (result.data.profile) {
          // Add the new post to the list immediately with profile
          const newPost = {
            ...result.data,
            profile: result.data.profile
          };
          setPosts(prev => [newPost, ...prev]);
        }
        
        setNewPostTitle('');
        setNewPostContent('');
        setMediaUrl('');
        setMediaType(null);
        setMediaPreview(null);
        setShowNewPostForm(false);
        await loadPosts();
        await loadForum(); // Refresh forum to update posts count
      } else {
        console.error('Error creating post:', result);
        const errorMessage = result.error || result.details || result.hint || 'שגיאה לא ידועה';
        console.error('Full error details:', {
          error: result.error,
          details: result.details,
          hint: result.hint,
          code: result.code
        });
        alert(`שגיאה ביצירת הפוסט: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('שגיאה ביצירת הפוסט. אנא נסה שוב.');
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image or video
    if (file.type.startsWith('image/')) {
      setMediaType('image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
        // In production, upload to Supabase Storage or your CDN
        // For now, we'll use a placeholder URL
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('אנא בחר קובץ תמונה או וידאו');
    }
  }

  function removeMedia() {
    setMediaUrl('');
    setMediaType(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function insertEmoji(emoji: string) {
    setNewPostContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  }

  async function handleSubmitComment(text: string) {
    if (!text.trim() || !selectedPost || !currentUser) {
      return;
    }

    const userId = currentUser.user_id || currentUser.id;
    if (!userId) {
      alert('שגיאה: לא נמצא משתמש מחובר');
      return;
    }

    try {
      const postId = typeof selectedPost.id === 'string' ? selectedPost.id : String(selectedPost.id);
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

      if (response.ok && result.data) {
        // Reload the post to get the updated hierarchical structure
        const { data, error } = await getForumPostById(selectedPost.id, currentUser.id);
        if (!error && data) {
          setSelectedPost(data);
          setPostReplies(data.replies || []);
        }
      } else {
        alert(`שגיאה ביצירת התגובה: ${result.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
    }
  }

  async function handleSubmitReply(commentId: string, text: string) {
    if (!text.trim() || !selectedPost || !currentUser) {
      return;
    }

    const userId = currentUser.user_id || currentUser.id;
    if (!userId) {
      alert('שגיאה: לא נמצא משתמש מחובר');
      return;
    }

    try {
      const postId = typeof selectedPost.id === 'string' ? selectedPost.id : String(selectedPost.id);
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

      if (response.ok && result.data) {
        // Reload the post to get the updated hierarchical structure
        const { data, error } = await getForumPostById(selectedPost.id, currentUser.id);
        if (!error && data) {
          setSelectedPost(data);
          setPostReplies(data.replies || []);
        }
      } else {
        alert(`שגיאה ביצירת התגובה: ${result.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
    }
  }


  async function handleDeleteComment(commentId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) return;
    
    try {
      const { error } = await deleteForumPostReply(commentId);
      if (!error) {
        // Reload the selected post to refresh replies
        if (selectedPost) {
          const { data, error: loadError } = await getForumPostById(selectedPost.id, currentUser?.id);
          if (!loadError && data) {
            setSelectedPost(data);
            setPostReplies(data.replies || []);
          }
        }
      } else {
        alert('שגיאה במחיקת התגובה. אנא נסה שוב.');
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('שגיאה במחיקת התגובה. אנא נסה שוב.');
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפוסט? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    setDeletingPostIds(prev => new Set(prev).add(postId));

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting to delete post:', postId);
        console.log('Current user:', currentUser);
        console.log('Is admin:', isAdmin);
      }

      const response = await fetch(`/api/forums/posts/${postId}/delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.error('Delete post error:', error);
        }
        throw new Error(error.error || error.details || 'שגיאה במחיקת הפוסט');
      }

      // Remove post from list
      setPosts(prev => prev.filter(p => p.id !== postId));
      
      // If the deleted post was selected, clear selection
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(null);
        setPostReplies([]);
      }

      // Reload forum to update posts count
      await loadForum();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      alert(error.message || 'שגיאה במחיקת הפוסט. אנא נסה שוב.');
    } finally {
      setDeletingPostIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
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
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return date.toLocaleDateString('he-IL');
  }

  const commonEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨', '😍', '🙌', '👏', '🎯', '💪', '🚀', '⭐'];

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

  async function handlePostClick(post: ForumPost) {
    setLoadingPost(true);
    setSelectedPost(post);
    
    try {
      const userId = currentUser?.id || currentUser?.user_id || undefined;
      const { data, error } = await getForumPostById(post.id, userId);
      
      if (error) {
        console.error('Error loading post:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        // If it's just a permission/RLS issue, still show the post with limited data
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('row-level security')) {
          console.warn('RLS permission issue - showing post with limited data');
          setSelectedPost(post);
          setPostReplies([]);
        } else {
          setPostReplies([]);
          alert('שגיאה בטעינת הפוסט. אנא נסה שוב.');
        }
      } else if (data) {
        setSelectedPost(data);
        setPostReplies(data.replies || []);
        
        // Update the post in the posts list with the updated views count
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p.id === post.id 
              ? { ...p, views: data.views || p.views }
              : p
          )
        );
      } else {
        // No error but no data - use the post we already have
        setSelectedPost(post);
        setPostReplies([]);
      }
    } catch (error: any) {
      console.error('Error loading post (catch):', {
        message: error?.message,
        stack: error?.stack,
        fullError: error
      });
      // On error, still show the post with limited data
      setSelectedPost(post);
      setPostReplies([]);
    } finally {
      setLoadingPost(false);
    }
  }


  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-500 text-lg">פורום לא נמצא</p>
          <Link href="/forums" className="text-[#F52F8E] hover:underline mt-4 inline-block">
            חזור לפורומים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Banner - Dark Background */}
          <div className={`${forum.header_color || 'bg-purple-900'} rounded-t-xl p-8 mb-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {forum.name === 'airtable' ? (
                  <div className="flex gap-1">
                    <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                    <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <div className="w-1 h-8 bg-purple-400 rounded"></div>
                    <div className="w-1 h-8 bg-pink-400 rounded"></div>
                    <div className="w-1 h-8 bg-purple-400 rounded"></div>
                  </div>
                )}
                <h1 className="text-4xl font-bold text-white">{forum.logo_text || 'make'}</h1>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-white mb-1">פורום</h2>
                <p className="text-white text-lg opacity-90">{forum.display_name}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-6 flex-col lg:flex-row">
            {/* Left Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {/* Create New Post Button */}
                {currentUser && (
                  <button
                    onClick={() => setShowNewPostForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
                  >
                    <Edit className="w-5 h-5" />
                    <span>פוסט חדש</span>
                  </button>
                )}
                
                {/* Discussion Groups */}
                <h2 className="text-xl font-bold text-gray-800 mb-4">קבוצות דיונים</h2>
                <div className="space-y-3">
                  {allForums.map((f) => (
                    <Link
                      key={f.id}
                      href={`/forums/${f.id}`}
                      className={`flex items-center gap-2 transition-colors ${
                        f.id === forumId 
                          ? 'text-[#F52F8E] font-medium' 
                          : 'text-gray-700 hover:text-[#F52F8E]'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        f.id === forumId ? 'bg-[#F52F8E]' : 'bg-blue-500'
                      }`}></div>
                      <span className="flex-1">{f.display_name}</span>
                      <span className={`text-sm font-medium ${
                        f.id === forumId ? 'text-[#F52F8E]' : 'text-[#F52F8E]'
                      }`}>
                        {f.posts_count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Create Post Modal */}
              {showNewPostForm && currentUser && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                  onClick={() => {
                    setShowNewPostForm(false);
                    setNewPostTitle('');
                    setNewPostContent('');
                    setMediaUrl('');
                    setMediaType(null);
                    setMediaPreview(null);
                  }}
                >
                  <div 
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                      <h2 className="text-2xl font-bold text-gray-800">פוסט חדש</h2>
                      <button
                        onClick={() => {
                          setShowNewPostForm(false);
                          setNewPostTitle('');
                          setNewPostContent('');
                          setMediaUrl('');
                          setMediaType(null);
                          setMediaPreview(null);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-5">
                      {/* Subject Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          נושא ההודעה
                        </label>
                        <input
                          type="text"
                          placeholder="הכנס כותרת לפוסט..."
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                          dir="rtl"
                          lang="he"
                          className="w-full px-4 py-3 border-2 border-[#F52F8E] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Content Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          תוכן
                        </label>
                        <div className="relative" dir="rtl">
                          <RichTextEditor
                            content={newPostContent}
                            onChange={setNewPostContent}
                            placeholder="תאר את הבעיה שלך או שתף ידע..."
                            userId={currentUser?.user_id || currentUser?.id}
                          />
                        </div>
                      </div>

                    </div>

                    {/* Modal Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                      <button
                        onClick={() => {
                          setShowNewPostForm(false);
                          setNewPostTitle('');
                          setNewPostContent('');
                          setMediaUrl('');
                          setMediaType(null);
                          setMediaPreview(null);
                        }}
                        className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        ביטול
                      </button>
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPostTitle.trim() || !newPostContent.trim()}
                        className="px-6 py-2.5 bg-[#F52F8E] text-white rounded-xl hover:bg-[#E01E7A] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        פרסם
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Post Detail or All Posts Section */}
              {selectedPost ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  {/* Back Button */}
                  <button
                    onClick={() => {
                      setSelectedPost(null);
                      setPostReplies([]);
                    }}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#F52F8E] mb-6 transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                    <span>חזור לרשימת הפוסטים</span>
                  </button>

                  {loadingPost ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
                      <p className="text-gray-600">טוען...</p>
                    </div>
                  ) : (
                    <>
                      {/* Post Content */}
                      <div className="mb-6 pb-6 border-b border-gray-200 relative">
                        {!userLoading && isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeletePost(selectedPost.id);
                            }}
                            disabled={deletingPostIds.has(selectedPost.id)}
                            className="absolute top-0 left-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50 flex-shrink-0 transition-colors"
                            title="מחק פוסט"
                          >
                            {deletingPostIds.has(selectedPost.id) ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <div className="flex items-start gap-4 mb-4">
                          {selectedPost.profile?.avatar_url ? (
                            <img
                              src={selectedPost.profile.avatar_url}
                              alt={selectedPost.profile.display_name || selectedPost.profile.first_name || selectedPost.profile.nickname || 'משתמש'}
                              className="w-12 h-12 rounded-full object-cover"
                              key={`post-${selectedPost.id}`}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-semibold">
                              {(selectedPost.profile?.display_name || selectedPost.profile?.first_name || selectedPost.profile?.nickname || 'U').charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-800">
                                {selectedPost.profile?.display_name || selectedPost.profile?.first_name || selectedPost.profile?.nickname || selectedPost.profile?.full_name || 'משתמש'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatTimeAgo(selectedPost.created_at)}
                              </span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-4">{selectedPost.title}</h1>
                            <div 
                              className="text-gray-700 leading-relaxed prose prose-sm max-w-none prose-img:max-w-full prose-img:rounded-lg prose-img:my-4"
                              dir="rtl"
                              dangerouslySetInnerHTML={{ __html: cleanPlaceholderImages(selectedPost.content || '') }}
                            />
                            {selectedPost.media_url && (
                              <div className="mt-4">
                                {selectedPost.media_type === 'image' ? (
                                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-gray-100">
                                    <img
                                      src={selectedPost.media_url}
                                      alt="Post media"
                                      className="w-full h-full object-contain"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                ) : selectedPost.media_type === 'video' ? (
                                  <video
                                    src={selectedPost.media_url}
                                    controls
                                    className="max-w-full rounded-lg"
                                  />
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
                          <button
                            onClick={async () => {
                              if (!currentUser || !selectedPost) return;
                              try {
                                const userId = currentUser.user_id || currentUser.id;
                                if (!userId) return;
                                const { data, error } = await toggleForumPostLike(selectedPost.id, userId);
                                if (!error && data) {
                                  // Reload post to get updated likes count
                                  const { data: updatedPost, error: loadError } = await getForumPostById(selectedPost.id, userId);
                                  if (!loadError && updatedPost) {
                                    setSelectedPost(updatedPost);
                                    setPostReplies(updatedPost.replies || []);
                                    // Also update in posts list
                                    setPosts(prevPosts => 
                                      prevPosts.map(p => 
                                        p.id === selectedPost.id 
                                          ? { ...p, likes_count: updatedPost.likes_count || 0, user_liked: updatedPost.user_liked }
                                          : p
                                      )
                                    );
                                  }
                                }
                              } catch (error) {
                                console.error('Error toggling like:', error);
                              }
                            }}
                            disabled={!currentUser}
                            className={`flex items-center gap-1 transition-colors ${
                              selectedPost.user_liked
                                ? 'text-[#F52F8E]'
                                : 'text-gray-500 hover:text-[#F52F8E]'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <Heart className={`w-4 h-4 ${selectedPost.user_liked ? 'fill-current' : ''}`} />
                            <span>{selectedPost.likes_count || 0}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{selectedPost.replies_count || postReplies.length} תגובות</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{selectedPost.views} צפיות</span>
                          </div>
                        </div>
                      </div>

                      {/* Replies Section */}
                      <div className="mb-6">
                        <CommentsList
                          comments={adaptForumRepliesToComments(postReplies)}
                          currentUser={currentUser}
                          onSubmitComment={handleSubmitComment}
                          onSubmitReply={handleSubmitReply}
                          onDeleteComment={handleDeleteComment}
                          emptyMessage="אין תגובות עדיין. היה הראשון להגיב!"
                          showForm={!!currentUser}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">כל הפוסטים</h2>
                  
                  {posts.length === 0 ? (
                    <div className="min-h-[200px] flex items-center justify-center">
                      <p className="text-gray-500 text-lg">לא נמצאו פוסטים</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => {
                        const isDeleting = deletingPostIds.has(post.id);
                        return (
                          <div
                            key={post.id}
                            className="relative w-full text-right p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] hover:shadow-md transition-all group"
                          >
                            <button
                              onClick={() => handlePostClick(post)}
                              className="w-full text-right"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {post.is_pinned && (
                                      <Pin className="w-4 h-4 text-[#F52F8E]" />
                                    )}
                                    {post.is_locked && (
                                      <Lock className="w-4 h-4 text-gray-400" />
                                    )}
                                    <h3 className="text-lg font-semibold text-gray-800">{post.title}</h3>
                                  </div>
                                  <div 
                                    className="text-gray-600 text-sm mb-3"
                                    dir="rtl"
                                  >
                                    {getPlainTextPreview(post.content || '', 25)}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-gray-500">
                                    {post.profile?.avatar_url ? (
                                      <img
                                        src={post.profile.avatar_url}
                                        alt={post.profile.display_name || 'משתמש'}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                        key={`post-${post.id}`}
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                        {(post.profile?.display_name || 'מ').charAt(0)}
                                      </div>
                                    )}
                                    <span>{post.profile?.display_name || 'משתמש'}</span>
                                    <span>•</span>
                                    <span>{new Date(post.created_at).toLocaleDateString('he-IL')}</span>
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
                            </button>
                            {!userLoading && isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeletePost(post.id);
                                }}
                                disabled={isDeleting}
                                className="absolute top-2 left-2 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50 flex-shrink-0 transition-colors"
                                title="מחק פוסט"
                              >
                                {isDeleting ? (
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


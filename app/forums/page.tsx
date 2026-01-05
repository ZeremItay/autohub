'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Edit, MessageSquare, ArrowRight, X, Video } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAllForums, type Forum } from '@/lib/queries/forums';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

// Lazy load RichTextEditor (heavy component)
const RichTextEditor = dynamic(
  () => import('@/app/components/RichTextEditor'),
  { ssr: false }
);

export default function ForumsPage() {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchDropdownStyle, setSearchDropdownStyle] = useState<React.CSSProperties>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // New post form state
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [selectedForumId, setSelectedForumId] = useState<string>('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function performSearch(query: string) {
    if (!query || query.trim().length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const { data, error } = await response.json();
      
      if (!error && data) {
        // Filter to only forum posts and replies
        const filteredResults = {
          forumPosts: data.forumPosts || [],
          forumReplies: data.forumReplies || []
        };
        setSearchResults(filteredResults);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    loadForums();
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults(null);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Calculate search dropdown position
  useEffect(() => {
    if (showSearchResults && searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setSearchDropdownStyle({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxWidth: '90vw'
      });
    }
  }, [showSearchResults, searchResults]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function loadForums() {
    setLoading(true);
    try {
      const { data, error } = await getAllForums();
      if (!error && data) {
        setForums(data);
      }
    } catch (error) {
      console.error('Error loading forums:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost() {
    // Check if content is empty (strip HTML tags for validation)
    const textContent = newPostContent.replace(/<[^>]*>/g, '').trim();
    if (!newPostTitle.trim() || !textContent) {
      alert('אנא מלא את כל השדות');
      return;
    }

    if (!selectedForumId) {
      alert('אנא בחר פורום');
      return;
    }
    
    if (!currentUser) {
      alert('לא נמצא משתמש מחובר. אנא רענן את הדף.');
      return;
    }
    
    const userId = currentUser.user_id || currentUser.id;
    if (!userId) {
      alert('שגיאה: לא נמצא משתמש מחובר');
      return;
    }
    
    try {
      const response = await fetch('/api/forums/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forum_id: selectedForumId,
          user_id: userId,
          title: newPostTitle,
          content: newPostContent,
          media_url: mediaUrl || null,
          media_type: mediaType || null
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        const errorMessage = result.error || result.message || result.details || result.hint || 'שגיאה לא ידועה';
        alert(`שגיאה ביצירת הפוסט: ${errorMessage}`);
        return;
      }
      
      if (response.ok && result.data) {
        setNewPostTitle('');
        setNewPostContent('');
        setMediaUrl('');
        setMediaType(null);
        setMediaPreview(null);
        setSelectedForumId('');
        setShowNewPostForm(false);
        
        // Navigate to the forum with the new post
        router.push(`/forums/${selectedForumId}`);
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">תכנים מקצועיים</h1>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            קהילה מקצועית שעוזרת בסיוע, בתמיכה, מציאת פתרונות ועזרה בכל מה שקשור לאוטומציות No Code ובינה מלאכותית.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-md" ref={searchRef}>
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2 && searchResults) {
                  setShowSearchResults(true);
                }
              }}
              placeholder="חיפוש בפוסטים ותגובות..."
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent bg-white"
            />
            {isSearching && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#F52F8E] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults && (
              <div 
                className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] max-h-[600px] overflow-y-auto"
                style={searchDropdownStyle}
              >
                <div className="p-3">
                  {/* Forum Posts Results */}
                  {searchResults.forumPosts.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2 px-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <h3 className="text-base font-bold text-gray-800">פוסטים בפורומים ({searchResults.forumPosts.length})</h3>
                      </div>
                      <div className="space-y-2.5">
                        {searchResults.forumPosts.slice(0, 5).map((post: any) => (
                          <Link
                            key={post.id}
                            href={`/forums/${post.forum_id}/posts/${post.id}`}
                            onClick={() => {
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-200 bg-white shadow-sm active:bg-pink-100"
                          >
                            <p className="text-sm font-semibold text-gray-900 break-words leading-relaxed">{post.title}</p>
                            {post.forums && (
                              <p className="text-xs text-gray-600 mt-1.5 break-words leading-relaxed">בפורום: {post.forums.display_name}</p>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Forum Replies Results */}
                  {searchResults.forumReplies.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2 px-2">
                        <MessageSquare className="w-5 h-5 text-[#F52F8E]" />
                        <h3 className="text-base font-bold text-gray-800">תגובות ({searchResults.forumReplies.length})</h3>
                      </div>
                      <div className="space-y-2.5">
                        {searchResults.forumReplies.slice(0, 5).map((reply: any) => (
                          <Link
                            key={reply.id}
                            href={`/forums/${reply.forum_posts?.forums?.id}/posts/${reply.post_id}`}
                            onClick={() => {
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-200 bg-white shadow-sm active:bg-pink-100"
                          >
                            <p className="text-sm text-gray-900 line-clamp-2 break-words leading-relaxed">{reply.content}</p>
                            {reply.forum_posts && (
                              <div className="mt-1.5">
                                <p className="text-xs text-gray-600 break-words leading-relaxed">בפוסט: {reply.forum_posts.title}</p>
                                {reply.forum_posts.forums && (
                                  <p className="text-xs text-gray-500 break-words leading-relaxed">בפורום: {reply.forum_posts.forums.display_name}</p>
                                )}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {searchResults.forumPosts.length === 0 && searchResults.forumReplies.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      <p className="text-sm">לא נמצאו תוצאות עבור "{searchQuery}"</p>
                    </div>
                  )}

                  {/* View All Results Link */}
                  {(searchResults.forumPosts.length > 5 || searchResults.forumReplies.length > 5) && (
                    <div className="pt-4 border-t-2 border-gray-200 mt-4">
                      <Link
                        href={`/search?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => {
                          setShowSearchResults(false);
                        }}
                        className="block text-center px-6 py-3.5 text-base font-bold text-[#F52F8E] hover:bg-pink-50 rounded-xl transition-colors border-2 border-[#F52F8E] active:bg-pink-100"
                      >
                        לכל התוצאות →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Main Content - Forum Cards */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-12">טוען...</div>
            ) : (
              <>
                {/* Forum Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {forums.map((forum) => (
                    <Link 
                      key={forum.id} 
                      href={`/forums/${forum.id}`}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    >
                      {/* Header */}
                      <div className={`${forum.header_color || 'bg-blue-900'} px-6 py-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {forum.name === 'airtable' ? (
                              <div className="flex gap-1">
                                <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                                <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                                <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                              </div>
                            ) : forum.name === 'n8n' ? (
                              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                                <span className="text-white font-bold text-sm">N8N</span>
                              </div>
                            ) : forum.name === 'crm' ? (
                              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                                <span className="text-white font-bold text-sm">CRM</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                                <span className="text-white font-bold text-sm">{forum.logo_text || 'M'}</span>
                              </div>
                            )}
                            <h3 className="text-white font-bold text-lg">{forum.logo_text || forum.display_name}</h3>
                          </div>
                        </div>
                        <p className="text-white text-sm opacity-90">פורום</p>
                      </div>
                      
                      {/* Body */}
                      <div className="p-6">
                        <h4 className="text-xl font-semibold text-gray-800 mb-2">{forum.display_name}</h4>
                        {forum.description && (
                          <p className="text-gray-600 text-sm mb-3">{forum.description}</p>
                        )}
                        {forum.posts_count === 0 ? (
                          <p className="text-gray-500 text-sm">אין פוסטים</p>
                        ) : (
                          <p className="text-[#F52F8E] text-sm font-medium">{forum.posts_count} פוסטים</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Viewing Info */}
                <div className="text-sm text-gray-500 mb-8">
                  מציג {forums.length} פורומים
                </div>

                {/* All Posts Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">כל הפוסטים</h2>
                  <div className="min-h-[200px] flex items-center justify-center">
                    <p className="text-gray-500 text-lg">לא נמצאו פוסטים</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar - Discussion Groups */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <button 
                onClick={() => {
                  if (!currentUser) {
                    alert('אנא התחבר כדי ליצור פוסט');
                    return;
                  }
                  setShowNewPostForm(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-6"
              >
                <Edit className="w-5 h-5" />
                <span>פוסט חדש</span>
              </button>
              <h2 className="text-xl font-bold text-gray-800 mb-4">קבוצות דיונים</h2>
              <div className="space-y-3">
                {forums.map((forum) => (
                  <Link 
                    key={forum.id} 
                    href={`/forums/${forum.id}`}
                    className="flex items-center gap-2 hover:text-[#F52F8E] transition-colors"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700 flex-1">{forum.display_name}</span>
                    <span className="text-[#F52F8E] text-sm font-medium">{forum.posts_count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

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
            setSelectedForumId('');
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
                  setSelectedForumId('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Forum Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  בחר פורום
                </label>
                <select
                  value={selectedForumId}
                  onChange={(e) => setSelectedForumId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#F52F8E] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                  dir="rtl"
                >
                  <option value="">בחר פורום...</option>
                  {forums.map((forum) => (
                    <option key={forum.id} value={forum.id}>
                      {forum.display_name}
                    </option>
                  ))}
                </select>
              </div>

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
                  setSelectedForumId('');
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                ביטול
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || !selectedForumId}
                className="px-6 py-2.5 bg-[#F52F8E] text-white rounded-xl hover:bg-[#E01E7A] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                פרסם
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


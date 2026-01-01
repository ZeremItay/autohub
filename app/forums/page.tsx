'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Edit, MessageSquare, ArrowRight, X, Video } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllForums, type Forum } from '@/lib/queries/forums';
import GlassCard from '@/app/components/GlassCard';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getCardStyles,
  getTextStyles,
  getButtonStyles,
  getBorderStyles,
  getProfessionalContentStyles,
  getForumHeaderStyles,
  combineStyles
} from '@/lib/utils/themeStyles';
import dynamic from 'next/dynamic';

// Lazy load RichTextEditor (heavy component)
const RichTextEditor = dynamic(
  () => import('@/app/components/RichTextEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-32 bg-white/5 rounded animate-pulse" />
  }
);

export default function ForumsPage() {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const { theme } = useTheme();
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchDropdownStyle, setSearchDropdownStyle] = useState<React.CSSProperties>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // New Post Modal States
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [selectedForumId, setSelectedForumId] = useState<string>('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        // Set default selected forum to first one if available
        if (data.length > 0 && !selectedForumId) {
          setSelectedForumId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading forums:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only handle video files (images are handled in RichTextEditor)
    if (file.type.startsWith('video/')) {
      setMediaType('video');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('אנא בחר קובץ וידאו');
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

  async function handleCreatePost() {
    // Check if content is empty (strip HTML tags for validation)
    const textContent = newPostContent.replace(/<[^>]*>/g, '').trim();
    if (!newPostTitle.trim() || !textContent) {
      alert('אנא מלא את כל השדות');
      return;
    }

    if (!selectedForumId) {
      alert('אנא בחר פורום לפרסום');
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
    
    setIsSubmitting(true);
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
      
      if (response.ok && result.data) {
        // Reset form
        setNewPostTitle('');
        setNewPostContent('');
        setMediaUrl('');
        setMediaType(null);
        setMediaPreview(null);
        setShowNewPostForm(false);
        
        // Redirect to the forum page
        router.push(`/forums/${selectedForumId}`);
      } else {
        const errorMessage = result.error || result.details || result.hint || 'שגיאה לא ידועה';
        alert(`שגיאה ביצירת הפוסט: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('שגיאה ביצירת הפוסט. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className={combineStyles(
          'mb-8 rounded-3xl p-6 sm:p-8',
          theme === 'light' ? getProfessionalContentStyles(theme) : 'glass-card'
        )}>
          <h1 className={combineStyles(
            'text-4xl font-bold mb-4',
            getTextStyles(theme, 'heading')
          )}>תכנים מקצועיים</h1>
          <p className={combineStyles(
            'text-lg mb-6 leading-relaxed',
            getTextStyles(theme, 'subheading')
          )}>
            קהילה מקצועית שעוזרת בסיוע, בתמיכה, מציאת פתרונות ועזרה בכל מה שקשור לאוטומציות No Code ובינה מלאכותית.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-md" ref={searchRef}>
            <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'light' ? 'text-gray-400' : 'text-gray-400'
            }`} />
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
              className={combineStyles(
                'w-full pr-10 pl-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]',
                theme === 'light'
                  ? 'border-gray-300 bg-white text-gray-800 placeholder-gray-500 focus:border-transparent'
                  : 'border-white/20 bg-white/5 text-white placeholder-gray-400 focus:border-transparent'
              )}
            />
            {isSearching && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#F52F8E] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults && (
              <div 
                className={`fixed rounded-xl shadow-2xl border z-[60] max-h-[600px] overflow-y-auto ${
                  theme === 'light'
                    ? 'bg-white border-gray-300'
                    : 'glass-card border-white/20'
                }`}
                style={searchDropdownStyle}
              >
                <div className="p-3">
                  {/* Forum Posts Results */}
                  {searchResults.forumPosts.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2 px-2">
                        <MessageSquare className={`w-5 h-5 ${
                          theme === 'light' ? 'text-blue-600' : 'text-cyan-400'
                        }`} />
                        <h3 className={`text-base font-bold ${
                          theme === 'light' ? 'text-gray-800' : 'text-white'
                        }`}>פוסטים בפורומים ({searchResults.forumPosts.length})</h3>
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
                            className={`block px-4 py-3 rounded-xl transition-colors border shadow-sm ${
                              theme === 'light'
                                ? 'hover:bg-gray-50 border-gray-300 bg-white'
                                : 'hover:bg-hot-pink/20 border-white/20 bg-white/5 active:bg-hot-pink/30'
                            }`}
                          >
                            <p className={`text-sm font-semibold break-words leading-relaxed ${
                              theme === 'light' ? 'text-gray-800' : 'text-white'
                            }`}>{post.title}</p>
                            {post.forums && (
                              <p className={`text-xs mt-1.5 break-words leading-relaxed ${
                                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                              }`}>בפורום: {post.forums.display_name}</p>
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
                        <MessageSquare className={`w-5 h-5 ${
                          theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                        }`} />
                        <h3 className={`text-base font-bold ${
                          theme === 'light' ? 'text-gray-800' : 'text-white'
                        }`}>תגובות ({searchResults.forumReplies.length})</h3>
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
                            className={`block px-4 py-3 rounded-xl transition-colors border shadow-sm ${
                              theme === 'light'
                                ? 'hover:bg-gray-50 border-gray-300 bg-white'
                                : 'hover:bg-hot-pink/20 border-white/20 bg-white/5 active:bg-hot-pink/30'
                            }`}
                          >
                            <p className={`text-sm line-clamp-2 break-words leading-relaxed ${
                              theme === 'light' ? 'text-gray-800' : 'text-white'
                            }`}>{reply.content}</p>
                            {reply.forum_posts && (
                              <div className="mt-1.5">
                                <p className={`text-xs break-words leading-relaxed ${
                                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                                }`}>בפוסט: {reply.forum_posts.title}</p>
                                {reply.forum_posts.forums && (
                                  <p className={`text-xs break-words leading-relaxed ${
                                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                                  }`}>בפורום: {reply.forum_posts.forums.display_name}</p>
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
                    <div className={`p-6 text-center ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>
                      <p className="text-sm">לא נמצאו תוצאות עבור "{searchQuery}"</p>
                    </div>
                  )}

                  {/* View All Results Link */}
                  {(searchResults.forumPosts.length > 5 || searchResults.forumReplies.length > 5) && (
                    <div className={`pt-4 border-t-2 mt-4 ${
                      theme === 'light' ? 'border-gray-300' : 'border-white/20'
                    }`}>
                      <Link
                        href={`/search?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => {
                          setShowSearchResults(false);
                        }}
                        className={`block text-center px-6 py-3.5 text-base font-bold rounded-full transition-colors border-2 ${
                          theme === 'light'
                            ? 'text-[#F52F8E] hover:bg-pink-50 border-[#F52F8E] active:bg-pink-100'
                            : 'text-hot-pink hover:bg-hot-pink/20 border-hot-pink active:bg-hot-pink/30'
                        }`}
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
                  {forums.map((forum) => {
                    // Unified styling - no special cases
                    const headerStyles = theme === 'light' 
                      ? getForumHeaderStyles(theme, 'default')
                      : 'bg-transparent text-white';
                    
                    return (
                      <Link 
                        key={forum.id} 
                        href={`/forums/${forum.id}`}
                        className={combineStyles(
                          'rounded-3xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer',
                          getCardStyles(theme, 'glass')
                        )}
                      >
                        {/* Header with unified colored background */}
                        <div className={combineStyles('px-6 py-4', headerStyles)}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {/* Unified icon - simple circle with forum initial */}
                              <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center
                                ${theme === 'light' 
                                  ? 'bg-white/30 border border-white/40' 
                                  : 'bg-white/10 border border-white/20'
                                }
                              `}>
                                <span className="font-bold text-sm text-white">
                                  {forum.logo_text?.[0]?.toUpperCase() || forum.display_name?.[0]?.toUpperCase() || 'F'}
                                </span>
                              </div>
                              <h3 className="font-bold text-lg text-white">
                                {forum.logo_text || forum.display_name}
                              </h3>
                            </div>
                          </div>
                          <p className="text-sm text-white/90">פורום</p>
                        </div>
                        
                        {/* Body - always white in light theme */}
                        <div className={combineStyles(
                          'p-6',
                          theme === 'light' ? 'bg-white' : 'bg-transparent'
                        )}>
                          <h4 className={combineStyles(
                            'text-xl font-semibold mb-2',
                            getTextStyles(theme, 'subheading')
                          )}>{forum.display_name}</h4>
                          {forum.description && (
                            <p className={combineStyles(
                              'text-sm mb-3',
                              getTextStyles(theme, 'muted')
                            )}>{forum.description}</p>
                          )}
                          {forum.posts_count === 0 ? (
                            <p className={combineStyles(
                              'text-sm',
                              getTextStyles(theme, 'muted')
                            )}>אין פוסטים</p>
                          ) : (
                            <p className={combineStyles(
                              'text-sm font-medium',
                              getTextStyles(theme, 'subheading')
                            )}>{forum.posts_count} פוסטים</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Viewing Info */}
                <div className={`text-sm mb-8 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  מציג {forums.length} פורומים
                </div>

                {/* All Posts Section */}
                <div className={`rounded-3xl p-6 sm:p-8 ${
                  theme === 'light'
                    ? 'bg-white border border-gray-300 shadow-sm'
                    : 'glass-card'
                }`}>
                  <h2 className={`text-2xl font-bold mb-6 ${
                    theme === 'light' ? 'text-gray-800' : 'text-white'
                  }`}>כל הפוסטים</h2>
                  <div className="min-h-[200px] flex items-center justify-center">
                    <p className={`text-lg ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>לא נמצאו פוסטים</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar - Discussion Groups */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className={`rounded-3xl p-6 sm:p-8 mb-6 ${
              theme === 'light'
                ? 'bg-white border border-gray-300 shadow-sm'
                : 'glass-card'
            }`}>
              <button 
                onClick={() => {
                  if (!currentUser) {
                    alert('עליך להתחבר כדי ליצור פוסט');
                    return;
                  }
                  setShowNewPostForm(true);
                }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-6 rounded-lg font-semibold transition-all ${
                  theme === 'light'
                    ? 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                    : 'btn-primary'
                }`}
                style={theme === 'light' ? { color: 'white' } : undefined}
              >
                <Edit className="w-5 h-5" style={theme === 'light' ? { color: 'white' } : undefined} />
                <span style={theme === 'light' ? { color: 'white' } : undefined}>פוסט חדש</span>
              </button>
              <h2 className={`text-xl font-bold mb-4 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>קבוצות דיונים</h2>
              <div className="space-y-3">
                {forums.map((forum) => (
                  <Link 
                    key={forum.id} 
                    href={`/forums/${forum.id}`}
                    className={`flex items-center gap-2 transition-colors ${
                      theme === 'light'
                        ? 'hover:text-[#F52F8E]'
                        : 'hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      theme === 'light' ? 'bg-blue-500' : 'bg-cyan-400'
                    }`}></div>
                    <span className={`flex-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                    }`}>{forum.display_name}</span>
                    <span className={`text-sm font-medium ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>{forum.posts_count}</span>
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
          }}
        >
          <div 
            className={`rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              theme === 'light'
                ? 'bg-white'
                : 'glass-card'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between rounded-t-3xl ${
              theme === 'light'
                ? 'bg-white border-gray-300'
                : 'glass-card border-white/20'
            }`}>
              <h2 className={`text-2xl font-bold ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>פוסט חדש</h2>
              <button
                onClick={() => {
                  setShowNewPostForm(false);
                  setNewPostTitle('');
                  setNewPostContent('');
                  setMediaUrl('');
                  setMediaType(null);
                  setMediaPreview(null);
                }}
                className={`p-2 rounded-full transition-colors ${
                  theme === 'light'
                    ? 'hover:bg-gray-100'
                    : 'hover:bg-white/20'
                }`}
                aria-label="סגור"
              >
                <X className={`w-5 h-5 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Forum Selection */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                  בחר פורום
                </label>
                <select
                  value={selectedForumId}
                  onChange={(e) => setSelectedForumId(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent ${
                    theme === 'light'
                      ? 'border-gray-300 bg-white text-gray-800 [&>option]:bg-white [&>option]:text-gray-800'
                      : 'border-hot-pink bg-white/5 text-white [&>option]:bg-[#1e293b] [&>option]:text-white'
                  }`}
                  dir="rtl"
                >
                  <option value="">-- בחר פורום --</option>
                  {forums.map((forum) => (
                    <option key={forum.id} value={forum.id}>
                      {forum.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Field */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                  נושא ההודעה
                </label>
                <input
                  type="text"
                  placeholder="הכנס כותרת לפוסט..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  dir="rtl"
                  lang="he"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent ${
                    theme === 'light'
                      ? 'border-gray-300 bg-white text-gray-800 placeholder-gray-500'
                      : 'border-hot-pink bg-white/5 text-white placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Content Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
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

              {/* Video Upload */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors cursor-pointer ${
                    theme === 'light'
                      ? 'border-gray-300 hover:bg-gray-50 text-gray-700'
                      : 'border-white/20 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  <span>וידאו (נפרד)</span>
                </label>
              </div>

              {/* Video Preview */}
              {mediaPreview && mediaType === 'video' && (
                <div className="relative">
                  <video src={mediaPreview} controls className="w-full max-h-64 rounded-[20px] border-2 border-hot-pink/40 shadow-[0_0_20px_rgba(236,72,153,0.3),0_8px_32px_rgba(0,0,0,0.5)]" />
                  <button
                    type="button"
                    onClick={removeMedia}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    aria-label="הסר וידאו"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 border-t px-6 py-4 flex items-center justify-end gap-3 rounded-b-3xl ${
              theme === 'light'
                ? 'bg-white border-gray-300'
                : 'glass-card border-white/20'
            }`}>
              <button
                onClick={() => {
                  setShowNewPostForm(false);
                  setNewPostTitle('');
                  setNewPostContent('');
                  setMediaUrl('');
                  setMediaType(null);
                  setMediaPreview(null);
                }}
                className={`px-6 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  theme === 'light'
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 hover:text-white'
                }`}
              >
                ביטול
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || !selectedForumId || isSubmitting}
                className={`px-6 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded-xl ${
                  theme === 'light'
                    ? 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                    : 'btn-primary'
                }`}
              >
                {isSubmitting ? 'מפרסם...' : 'פרסם'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, Flame, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/queries/blog';

const categories = [
  { id: 'all', name: 'הכל' },
  { id: 'tips-guides', name: 'טיפים ומדריכים' },
  { id: 'success-stories', name: 'סיפורי הצלחה' },
  { id: 'news', name: 'חדשות' },
  { id: 'interviews', name: 'ראיונות' },
  { id: 'technology', name: 'טכנולוגיה' },
  { id: 'business', name: 'עסקים' }
];

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      // Load featured posts
      const { data: featured, error: featuredError } = await getAllBlogPosts({
        featured: true,
        limit: 3
      });
      if (featuredError) {
        console.warn('Error loading featured posts:', featuredError);
      } else {
      }
      setFeaturedPosts(featured || []);

      // Load all posts (no category filtering - we'll filter client-side)
      const { data: allPosts, error: allPostsError } = await getAllBlogPosts();
      if (allPostsError) {
        console.warn('Error loading all posts:', allPostsError);
      }
      setPosts(allPosts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
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

  // Filter posts based on search and category (client-side)
  const filteredPosts = posts.filter(post => {
    // Filter by category
    if (selectedCategory !== 'all') {
      if (post.category !== selectedCategory) return false;
    }
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">הבלוג</h1>
          <p className="text-base sm:text-lg text-gray-600">מאמרים, מדריכים וטיפים מהקהילה</p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש מאמרים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-[#F52F8E] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && !searchQuery && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-6 h-6 text-[#F52F8E]" />
              <h2 className="text-2xl font-bold text-gray-800">פוסטים מומלצים</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="relative h-48 overflow-hidden">
                    {post.featured_image_url ? (
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                        <span className="text-4xl text-[#F52F8E]">📝</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                        מומלץ
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mb-3">
                      {categories.find(c => c.id === post.category)?.name || post.category}
                    </span>
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-[#F52F8E] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        {post.profile && (
                          <div className="flex items-center gap-2">
                            {post.profile.avatar_url ? (
                              <img
                                src={post.profile.avatar_url}
                                alt={post.profile.display_name}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white text-xs">
                                {post.profile.display_name?.charAt(0) || 'א'}
                              </div>
                            )}
                            <span className="font-medium">{post.profile.display_name || 'מחבר'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{post.read_time_minutes || 5} דקות קריאה</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Posts */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">כל המאמרים</h2>
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-500">לא נמצאו מאמרים</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden">
                      {post.featured_image_url ? (
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                          <span className="text-4xl text-[#F52F8E]">📝</span>
                        </div>
                      )}
                      {post.is_featured && (
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                            מומלץ
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col justify-between">
                      <div>
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mb-3">
                          {categories.find(c => c.id === post.category)?.name || post.category}
                        </span>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-[#F52F8E] transition-colors">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          {post.profile && (
                            <div className="flex items-center gap-2">
                              {post.profile.avatar_url ? (
                                <img
                                  src={post.profile.avatar_url}
                                  alt={post.profile.display_name}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white text-sm">
                                  {post.profile.display_name?.charAt(0) || 'א'}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-700">{post.profile.display_name || 'מחבר'}</p>
                                <p className="text-xs text-gray-500">מחבר</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(post.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{post.read_time_minutes || 5} דקות קריאה</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-[#F52F8E] group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


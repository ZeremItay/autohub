'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Video, MessageSquare, FileText, Briefcase, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      performSearch(query);
    } else {
      setLoading(false);
    }
  }, [query]);

  async function performSearch(searchQuery: string) {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const { data, error } = await response.json();
      
      if (!error && data) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTotalResults() {
    if (!searchResults) return 0;
    return (
      searchResults.recordings.length +
      searchResults.forums.length +
      searchResults.forumPosts.length +
      searchResults.posts.length +
      searchResults.projects.length +
      searchResults.courses.length
    );
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#F52F8E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">מחפש...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-8 h-8 text-[#F52F8E]" />
            <h1 className="text-4xl font-bold text-gray-800">תוצאות חיפוש</h1>
          </div>
          {query && (
            <p className="text-gray-600 text-lg">
              חיפוש עבור: <span className="font-semibold text-[#F52F8E]">"{query}"</span>
            </p>
          )}
          {searchResults && (
            <p className="text-gray-500 text-sm mt-2">
              נמצאו {getTotalResults()} תוצאות
            </p>
          )}
        </div>

        {!query ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">הזן שאילתת חיפוש</p>
          </div>
        ) : getTotalResults() === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">לא נמצאו תוצאות עבור "{query}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Recordings */}
            {searchResults.recordings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Video className="w-6 h-6 text-[#F52F8E]" />
                  <h2 className="text-2xl font-bold text-gray-800">הקלטות ({searchResults.recordings.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.recordings.map((recording: any) => (
                    <Link
                      key={recording.id}
                      href={`/recordings/${recording.id}`}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{recording.title}</h3>
                      {recording.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{recording.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Forums */}
            {searchResults.forums.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-6 h-6 text-[#F52F8E]" />
                  <h2 className="text-2xl font-bold text-gray-800">פורומים ({searchResults.forums.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.forums.map((forum: any) => (
                    <Link
                      key={forum.id}
                      href={`/forums/${forum.id}`}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{forum.display_name || forum.name}</h3>
                      {forum.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{forum.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Forum Posts */}
            {searchResults.forumPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-800">פוסטים בפורומים ({searchResults.forumPosts.length})</h2>
                </div>
                <div className="space-y-3">
                  {searchResults.forumPosts.map((post: any) => (
                    <Link
                      key={post.id}
                      href={`/forums/${post.forum_id}/posts/${post.id}`}
                      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{post.title}</h3>
                      {post.forums && (
                        <p className="text-sm text-gray-600">בפורום: {post.forums.display_name}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Posts (Announcements) */}
            {searchResults.posts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-800">הכרזות ({searchResults.posts.length})</h2>
                </div>
                <div className="space-y-3">
                  {searchResults.posts.map((post: any) => (
                    <div
                      key={post.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                    >
                      <p className="text-gray-800 mb-2">{post.content}</p>
                      {post.profiles && (
                        <p className="text-sm text-gray-600">מאת: {post.profiles.display_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {searchResults.projects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-800">פרויקטים ({searchResults.projects.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.projects.map((project: any) => (
                    <Link
                      key={project.id}
                      href={`/projects#${project.id}`}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{project.title}</h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Courses */}
            {searchResults.courses.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                  <h2 className="text-2xl font-bold text-gray-800">קורסים ({searchResults.courses.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.courses.map((course: any) => (
                    <Link
                      key={course.id}
                      href={`/courses#${course.id}`}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-hot-pink mx-auto mb-4" />
          <p className="text-gray-300">טוען...</p>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}


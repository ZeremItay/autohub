'use client';

import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { getAllCourses, getCoursesByCategory, getCoursesInProgress, checkEnrollment, type Course } from '@/lib/queries/courses';
import { getAllProfiles } from '@/lib/queries/profiles';
import { isAdmin } from '@/lib/utils/user';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [inProgressCourses, setInProgressCourses] = useState<Course[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('הכל');
  const [enrollments, setEnrollments] = useState<Map<string, boolean>>(new Map());
  
  const categories = ['הכל', 'Make.com', 'AI', 'Airtable', 'בוטים', 'עסקים', 'כללי'];

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadCourses();
      loadInProgressCourses();
    }
  }, [currentUser, selectedCategory]);

  async function loadCurrentUser() {
    try {
      const { data: profiles } = await getAllProfiles();
      if (Array.isArray(profiles) && profiles.length > 0) {
        const firstUser = profiles[0];
        setCurrentUser({ 
          id: firstUser.user_id || firstUser.id, 
          ...firstUser 
        });
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  async function loadCourses() {
    setLoading(true);
    try {
      const { data, error } = selectedCategory === 'הכל'
        ? await getAllCourses(currentUser?.id)
        : await getCoursesByCategory(selectedCategory, currentUser?.id);
      
      if (!error && data) {
        setCourses(data);
        
        // Check enrollments for all courses
        if (currentUser && !isAdmin(currentUser)) {
          const enrollmentMap = new Map<string, boolean>();
          for (const course of data) {
            const { data: enrollment } = await checkEnrollment(course.id, currentUser.id);
            enrollmentMap.set(course.id, !!enrollment);
          }
          setEnrollments(enrollmentMap);
        } else if (isAdmin(currentUser)) {
          // Admin is enrolled in all courses
          const enrollmentMap = new Map<string, boolean>();
          data.forEach(course => enrollmentMap.set(course.id, true));
          setEnrollments(enrollmentMap);
        }
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInProgressCourses() {
    if (!currentUser) return;
    
    try {
      const { data, error } = await getCoursesInProgress(currentUser.id);
      if (!error && data) {
        setInProgressCourses(data);
      }
    } catch (error) {
      console.error('Error loading in-progress courses:', error);
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'מתחילים':
        return 'bg-green-500 text-white';
      case 'בינוני':
        return 'bg-yellow-500 text-white';
      case 'מתקדמים':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }

  function filteredCourses() {
    if (!searchQuery) return courses;
    return courses.filter(course =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">קורסים</h1>
            <p className="text-lg text-gray-600 mb-6">למד אוטומציות ו-AI בקצב שלך</p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mb-6">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="חפש קורסים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent bg-white"
              />
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Continue Learning Section */}
          {inProgressCourses.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">ממשיכים ללמוד</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {inProgressCourses.slice(0, 2).map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">{course.title.charAt(0)}</span>
                        </div>
                      )}
                      {course.is_recommended && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                          מומלץ
                        </span>
                      )}
                      {course.is_new && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                          חדש
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span>{course.duration_hours} שעות</span>
                        <span>•</span>
                        <span>{course.lessons_count} שיעורים</span>
                      </div>
                      {course.progress !== undefined && (
                        <div className="mb-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#F52F8E] h-2 rounded-full transition-all"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${getDifficultyColor(course.difficulty)}`}>
                        {course.difficulty}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All Courses Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">כל הקורסים</h2>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-5 h-5" />
                <span>סינון</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">טוען...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses().map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">{course.title.charAt(0)}</span>
                        </div>
                      )}
                      {course.is_new && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                          חדש
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 flex-wrap">
                        <span>{course.duration_hours} שעות</span>
                        <span>•</span>
                        <span>{course.lessons_count} שיעורים</span>
                        {course.is_free || !course.price || course.price === 0 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">חינם</span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">{course.price} ₪</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${getDifficultyColor(course.difficulty)}`}>
                          {course.difficulty}
                        </span>
                        {currentUser && (enrollments.get(course.id) || isAdmin(currentUser)) ? (
                          <span className="text-[#F52F8E] text-sm font-semibold">המשך ללמוד →</span>
                        ) : (
                          <span className="text-gray-500 text-sm">הירשם →</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


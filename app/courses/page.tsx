'use client';

import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { getAllCourses, getCoursesByCategory, getCoursesInProgress, checkEnrollment, type Course } from '@/lib/queries/courses';
import { getAllProfiles } from '@/lib/queries/profiles';
import { isAdmin } from '@/lib/utils/user';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getCardStyles,
  getTextStyles,
  getCategoryTagStyles,
  combineStyles
} from '@/lib/utils/themeStyles';

export default function CoursesPage() {
  const { theme } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [inProgressCourses, setInProgressCourses] = useState<Course[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('הכל');
  const [enrollments, setEnrollments] = useState<Map<string, boolean>>(new Map());
  const [categories, setCategories] = useState<string[]>(['הכל']);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadInProgressCourses();
      loadCategories();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadCourses();
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

  async function loadCategories() {
    try {
      // Load all courses to extract unique categories
      const { data: allCoursesData } = await getAllCourses(currentUser?.id);
      if (allCoursesData && Array.isArray(allCoursesData)) {
        const uniqueCategories = Array.from(
          new Set(
            allCoursesData
              .map(course => course.category)
              .filter(category => category && category.trim() !== '')
          )
        ).sort();
        setCategories(['הכל', ...uniqueCategories]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async function loadCourses() {
    setLoading(true);
    try {
      // Load courses based on selected category
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
    <div className="min-h-screen relative">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'light' ? 'text-gray-800' : 'text-white'
            }`}>קורסים</h1>
            <p className={`text-lg mb-6 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>למד אוטומציות ו-AI בקצב שלך</p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mb-6">
              <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'light' ? 'text-gray-400' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="חפש קורסים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pr-10 pl-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base ${
                  theme === 'light'
                    ? 'border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400'
                    : 'modern-input border border-white/20 rounded-full focus:border-transparent text-white placeholder:text-gray-400'
                }`}
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
                      ? theme === 'light'
                        ? 'bg-[#F52F8E] text-white shadow-md'
                        : 'bg-hot-pink text-white'
                      : theme === 'light'
                        ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#F52F8E]'
                        : 'glass-card text-gray-200 hover:bg-white/10'
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
              <h2 className={`text-2xl font-bold mb-6 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>ממשיכים ללמוד</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {inProgressCourses.slice(0, 2).map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className={`rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                      theme === 'light' 
                        ? 'bg-white border border-gray-300' 
                        : 'glass-card'
                    }`}
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
                          <span className="text-2xl font-bold" style={{ color: 'white' }}>{course.title.charAt(0)}</span>
                        </div>
                      )}
                      {course.is_recommended && (
                        <span 
                          className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full"
                          style={{ 
                            backgroundColor: theme === 'light' ? '#F52F8E' : '#ec4899',
                            color: 'white'
                          }}
                        >
                          מומלץ
                        </span>
                      )}
                      {course.is_new && (
                        <span 
                          className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full"
                          style={{ 
                            backgroundColor: theme === 'light' ? '#F52F8E' : '#ec4899',
                            color: 'white'
                          }}
                        >
                          חדש
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className={`text-xl font-bold mb-2 ${
                        theme === 'light' ? 'text-gray-800' : 'text-white'
                      }`}>{course.title}</h3>
                      <p className={`text-sm mb-4 line-clamp-2 ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-200'
                      }`}>{course.description}</p>
                      <div className={`flex items-center gap-4 text-sm mb-4 ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                      }`}>
                        <span>{course.duration_hours} שעות</span>
                        <span>•</span>
                        <span>{course.lessons_count} שיעורים</span>
                      </div>
                      {course.progress !== undefined && (
                        <div className="mb-4">
                          <div className={`w-full rounded-full h-2 ${
                            theme === 'light' ? 'bg-gray-200' : 'bg-white/10'
                          }`}>
                            <div
                              className={`h-2 rounded-full transition-all ${
                                theme === 'light' ? 'bg-[#F52F8E]' : 'bg-hot-pink'
                              }`}
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      <span 
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(course.difficulty)}`}
                        style={{ color: 'white' }}
                      >
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
              <h2 className={`text-2xl font-bold ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>כל הקורסים</h2>
              <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'glass-card rounded-full hover:bg-white/10 text-white'
              }`}>
                <Filter className="w-5 h-5" />
                <span>סינון</span>
              </button>
            </div>

            {loading ? (
              <div className={`text-center py-12 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
              }`}>טוען...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses().map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className={`rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                      theme === 'light' 
                        ? 'bg-white border border-gray-300' 
                        : 'glass-card'
                    }`}
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
                          <span className="text-2xl font-bold" style={{ color: 'white' }}>{course.title.charAt(0)}</span>
                        </div>
                      )}
                      {course.is_new && (
                        <span 
                          className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full"
                          style={{ 
                            backgroundColor: theme === 'light' ? '#F52F8E' : '#ec4899',
                            color: 'white'
                          }}
                        >
                          חדש
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className={`text-xl font-bold mb-2 ${
                        theme === 'light' ? 'text-gray-800' : 'text-white'
                      }`}>{course.title}</h3>
                      <p className={`text-sm mb-4 line-clamp-2 ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-200'
                      }`}>{course.description}</p>
                      <div className={`flex items-center gap-4 text-sm mb-4 flex-wrap ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                      }`}>
                        <span>{course.duration_hours} שעות</span>
                        <span>•</span>
                        <span>{course.lessons_count} שיעורים</span>
                        {course.is_free || !course.price || course.price === 0 ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            theme === 'light'
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-green-500/30 text-green-300 border border-green-500/50'
                          }`}>חינם</span>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            theme === 'light'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                          }`}>{course.price} ₪</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span 
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(course.difficulty)}`}
                          style={{ color: 'white' }}
                        >
                          {course.difficulty}
                        </span>
                        {currentUser && (enrollments.get(course.id) || isAdmin(currentUser)) ? (
                          <span 
                            className="text-sm font-semibold"
                            style={{ color: theme === 'light' ? '#F52F8E' : '#ec4899' }}
                          >המשך ללמוד →</span>
                        ) : (
                          <span className={`text-sm ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>הירשם →</span>
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


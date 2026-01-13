'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Clock, CheckCircle, Lock, ArrowRight, ArrowLeft, HelpCircle, Star, ChevronDown, ChevronUp, ExternalLink, X, BookOpen } from 'lucide-react';
import { getCourseById, getCourseLessons, getCourseSections, checkEnrollment, enrollInCourse, markLessonComplete, markLessonIncomplete, getCompletedLessons, isLessonCompleted, canAccessLesson, getNextAvailableLesson, type Course, type CourseLesson, type CourseSection } from '@/lib/queries/courses';
import { getCurrentUserProfile } from '@/lib/queries/profiles';
import { isAdmin, isPremiumUser } from '@/lib/utils/user';
import { awardPoints } from '@/lib/queries/gamification';
import ProtectedAction from '@/app/components/ProtectedAction';
import Link from 'next/link';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [openQaIndex, setOpenQaIndex] = useState<number | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessonAccessStatus, setLessonAccessStatus] = useState<Map<string, boolean>>(new Map());
  const [markingComplete, setMarkingComplete] = useState(false);
  const [nextAvailableLesson, setNextAvailableLesson] = useState<CourseLesson | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  // Update next available lesson when selected lesson or completed lessons change
  useEffect(() => {
    async function updateNextLesson() {
      if (!currentUser || !selectedLesson || !course || !lessons.length) {
        setNextAvailableLesson(null);
        return;
      }
      
      const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
      if (currentIndex === -1) {
        setNextAvailableLesson(null);
        return;
      }
      
      if (course.is_sequential) {
        // For sequential courses, only show next lesson if current lesson is completed
        const isCurrentCompleted = completedLessons.includes(selectedLesson.id);
        if (isCurrentCompleted) {
          const nextLesson = await getNextAvailableLesson(course.id, currentUser.id, currentIndex);
          setNextAvailableLesson(nextLesson);
        } else {
          // Don't show next lesson if current lesson is not completed
          setNextAvailableLesson(null);
        }
      } else {
        // For non-sequential courses, just get the next lesson in order
        const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
        setNextAvailableLesson(nextLesson);
      }
    }
    
    updateNextLesson();
  }, [selectedLesson, completedLessons, course, currentUser, lessons]);

  async function loadData() {
    setLoading(true);
    setCheckingEnrollment(true);
    try {
      // Load current user (optimized - only current user, not all profiles)
      const { data: currentUserProfile } = await getCurrentUserProfile();
      let userId: string | undefined;
      let userIsEnrolled = false;
      let userObj: any = null;
      
      if (currentUserProfile) {
        userId = currentUserProfile.user_id || currentUserProfile.id;
        userObj = { 
          id: userId, 
          ...currentUserProfile 
        };
        setCurrentUser(userObj);
      }

      // Check if user is admin (admin can access all courses)
      const isUserAdmin = userObj && isAdmin(userObj);
      
      // Run parallel requests for course, enrollment check, sections, and lessons
      const [courseResult, enrollmentResult, sectionsResult, lessonsResult] = await Promise.all([
        getCourseById(courseId, userId),
        userId && !isUserAdmin ? checkEnrollment(courseId, userId) : Promise.resolve({ data: isUserAdmin ? { id: 'admin' } : null, error: null }),
        getCourseSections(courseId).catch(() => ({ data: null, error: null })), // Don't fail if sections don't exist
        getCourseLessons(courseId).catch(() => ({ data: null, error: null })) // Don't fail if lessons don't exist
      ]);

      const { data: courseData, error: courseError } = courseResult;
      const { data: enrollment } = enrollmentResult;
      
      // Check if course is draft - non-admins cannot access draft courses
      if (!courseError && courseData) {
        const isDraft = courseData.status === 'draft';
        if (isDraft && !isUserAdmin) {
          // Redirect non-admin users away from draft courses
          router.push('/courses');
          return;
        }
        setCourse(courseData);
      }
      
      userIsEnrolled = isUserAdmin || !!enrollment;
      setIsEnrolled(userIsEnrolled);
      setCheckingEnrollment(false);

      // Only load lessons if enrolled or admin
      if (userIsEnrolled) {
        const { data: sectionsData, error: sectionsError } = sectionsResult;
        const { data: lessonsData, error: lessonsError } = lessonsResult;
        
        if (sectionsError && process.env.NODE_ENV === 'development') {
          console.error('Error loading sections:', sectionsError);
        }
        
        if (sectionsData && sectionsData.length > 0) {
          setSections(sectionsData);
          // Open first section by default
          setOpenSections(new Set([sectionsData[0].id]));
        } else {
          setSections([]);
        }
        
        if (lessonsError && process.env.NODE_ENV === 'development') {
          console.error('Error loading lessons:', lessonsError);
          setLessons([]);
        } else if (lessonsData && lessonsData.length > 0) {
          setLessons(lessonsData);
          
          // If sections weren't loaded but lessons have section_id, try to load sections again
          if ((!sectionsData || sectionsData.length === 0) && lessonsData.length > 0) {
            const lessonsWithSections = lessonsData.filter((l: any) => l.section_id);
            if (lessonsWithSections.length > 0) {
              const { data: retrySectionsData } = await getCourseSections(courseId).catch(() => ({ data: null, error: null }));
              if (retrySectionsData && retrySectionsData.length > 0) {
                setSections(retrySectionsData);
                setOpenSections(new Set([retrySectionsData[0].id]));
              }
            }
          }
          
          // Load completed lessons and determine next lesson (optimized)
          if (userId) {
            // Load completed lessons in parallel with lesson access check
            const [completedLessonsResult] = await Promise.all([
              getCompletedLessons(courseId, userId)
            ]);
            
            const { data: completedLessonIds } = completedLessonsResult;
            const completedIds = Array.isArray(completedLessonIds) ? completedLessonIds : [];
            
            await loadCompletedLessons(courseId, userId);
            await checkLessonAccess(courseId, userId, lessonsData);
            
            // Find the next lesson to watch (optimized - no loop with API calls)
            let nextLesson: CourseLesson | null = null;
            
            if (courseData?.is_sequential) {
              // For sequential courses, check accessibility without API calls
              // First lesson is always accessible
              for (let i = 0; i < lessonsData.length; i++) {
                const lesson = lessonsData[i];
                const isCompleted = completedIds.includes(lesson.id);
                
                // Check if accessible: first lesson OR previous lesson is completed
                const isAccessible = i === 0 || completedIds.includes(lessonsData[i - 1].id);
                
                if (isAccessible && !isCompleted) {
                  nextLesson = lesson;
                  break;
                }
              }
            } else {
              // For non-sequential courses, find first incomplete lesson
              for (const lesson of lessonsData) {
                const isCompleted = completedIds.includes(lesson.id);
                if (!isCompleted) {
                  nextLesson = lesson;
                  break;
                }
              }
            }
            
            if (nextLesson) {
              setSelectedLesson(nextLesson);
            } else {
              // If all lessons completed, show the last one
              setSelectedLesson(lessonsData[lessonsData.length - 1]);
            }
          } else {
            // No user, just show first lesson
            setSelectedLesson(lessonsData[0]);
          }
        } else {
          setLessons([]);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading course:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadCompletedLessons(courseId: string, userId: string) {
    try {
      const { data, error } = await getCompletedLessons(courseId, userId);
      if (!error && data) {
        setCompletedLessons(data);
      }
    } catch (error) {
      console.error('Error loading completed lessons:', error);
    }
  }

  async function checkLessonAccess(courseId: string, userId: string, lessonsList: CourseLesson[]) {
    try {
      const accessMap = new Map<string, boolean>();
      
      for (const lesson of lessonsList) {
        const canAccess = await canAccessLesson(lesson.id, courseId, userId);
        accessMap.set(lesson.id, canAccess);
      }
      
      setLessonAccessStatus(accessMap);
    } catch (error) {
      console.error('Error checking lesson access:', error);
    }
  }

  async function handleMarkComplete() {
    if (!selectedLesson || !currentUser || !course || markingComplete) return;
    
    // Don't allow marking incomplete - once completed, it stays completed
    if (completedLessons.includes(selectedLesson.id)) {
      return;
    }
    
    setMarkingComplete(true);
    try {
          // Mark as complete
          const { error } = await markLessonComplete(selectedLesson.id, course.id, currentUser.id);
          if (!error) {
            const updatedCompletedLessons = [...completedLessons, selectedLesson.id];
            setCompletedLessons(updatedCompletedLessons);
            
            // Award points for completing a lesson
            try {
              console.log('🎯 Attempting to award points for lesson completion...');
              const result = await awardPoints(currentUser.id, 'סיום שיעור', { checkDaily: false });
              if (result.success) {
                console.log('✅ Points awarded successfully for lesson completion');
              } else {
                console.warn('⚠️ Points not awarded:', result.error, result);
                if (result.error === 'Rule not found') {
                  console.warn('⚠️ Rule "סיום שיעור" not found in gamification_rules table. Please add it via admin panel or SQL script.');
                }
              }
            } catch (pointsError) {
              console.error('❌ Error awarding points for lesson completion:', pointsError);
            }
            
            // Check if course is fully completed
            const allLessonsCompleted = updatedCompletedLessons.length === lessons.length;
            if (allLessonsCompleted) {
              // Award points for completing the entire course
              try {
                console.log('🎯 Attempting to award points for course completion...');
                const courseResult = await awardPoints(currentUser.id, 'השלמת קורס', { checkDaily: false });
                if (courseResult.success) {
                  console.log('✅ Points awarded successfully for course completion');
                  alert('🎉 מזל טוב! השלמת את כל השיעורים בקורס!');
                } else {
                  console.warn('⚠️ Points not awarded for course completion:', courseResult.error, courseResult);
                  if (courseResult.error === 'Rule not found') {
                    console.warn('⚠️ Rule "השלמת קורס" not found in gamification_rules table. Please add it via admin panel or SQL script.');
                  }
                }
              } catch (coursePointsError) {
                console.error('❌ Error awarding points for course completion:', coursePointsError);
              }
            }
            
            // If course is sequential, check access for next lessons
            if (course.is_sequential) {
              await checkLessonAccess(course.id, currentUser.id, lessons);
              // Update next available lesson
              const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
              if (currentIndex !== -1) {
                const nextLesson = await getNextAvailableLesson(course.id, currentUser.id, currentIndex);
                setNextAvailableLesson(nextLesson);
              }
            }
          } else {
            console.error('=== ERROR MARKING LESSON COMPLETE ===');
            console.error('Error object:', error);
            console.error('Error type:', typeof error);
            console.error('Error keys:', Object.keys(error || {}));
            console.error('Error code:', (error as any)?.code);
            console.error('Error message:', (error as any)?.message);
            console.error('Error details:', (error as any)?.details);
            console.error('Error hint:', (error as any)?.hint);
            console.error('Full error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            console.error('=== END ERROR ===');
            
            // Check if it's a table not found error
            if ((error as any)?.code === 'PGRST116' || (error as any)?.message?.includes('lesson_completions')) {
              alert('הטבלה lesson_completions לא קיימת. אנא הרץ את ה-SQL script: supabase-create-lesson-completions-table.sql');
            } else {
              alert(`שגיאה בסימון השיעור: ${(error as any)?.message || 'שגיאה לא ידועה'}`);
            }
          }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      alert('שגיאה בסימון השיעור. נסה שוב.');
    } finally {
      setMarkingComplete(false);
    }
  }

  async function handleEnroll() {
    // ProtectedAction already handles auth check, but keep this as a safety check
    if (!currentUser) {
      return; // ProtectedAction will show tooltip
    }
    
    if (!course) return;
    
    // Admin doesn't need to enroll - they can access all courses
    if (isAdmin(currentUser)) {
      setIsEnrolled(true);
      // Reload lessons and find next lesson to watch
      const { data: lessonsData } = await getCourseLessons(courseId);
      if (lessonsData) {
        setLessons(lessonsData);
        if (lessonsData.length > 0 && currentUser) {
          // Find next lesson to watch
          const { data: completedLessonIds } = await getCompletedLessons(courseId, currentUser.id);
          const completedIds = Array.isArray(completedLessonIds) ? completedLessonIds : [];
          
          let nextLesson: CourseLesson | null = null;
          
          if (course.is_sequential) {
            for (const lesson of lessonsData) {
              const canAccess = await canAccessLesson(lesson.id, courseId, currentUser.id);
              const isCompleted = completedIds.includes(lesson.id);
              if (canAccess && !isCompleted) {
                nextLesson = lesson;
                break;
              }
            }
          } else {
            for (const lesson of lessonsData) {
              const isCompleted = completedIds.includes(lesson.id);
              if (!isCompleted) {
                nextLesson = lesson;
                break;
              }
            }
          }
          
          setSelectedLesson(nextLesson || lessonsData[0]);
        } else if (lessonsData.length > 0) {
          setSelectedLesson(lessonsData[0]);
        }
      }
      return;
    }
    
    // Check if course requires payment
    // Free and basic users always pay full price for paid courses
    // Premium users pay only if not free_for_premium
    const userRole = currentUser?.roles?.name || currentUser?.role?.name;
    const isPremium = userRole === 'premium' || userRole === 'admin';
    const isFreeOrBasic = userRole === 'free' || userRole === 'basic';
    
    const requiresPayment = !course.is_free && 
                           course.price && 
                           course.price > 0 && 
                           (isFreeOrBasic || !(course.is_free_for_premium && isPremium));
    
    if (requiresPayment) {
      // Redirect to payment page with course ID
      router.push(`/payment?courseId=${courseId}`);
      return;
    }
    
    setEnrolling(true);
    try {
      const { data, error } = await enrollInCourse(courseId, currentUser.id);
      
      if (error) {
        console.error('Enrollment error details:', {
          code: error.code,
          message: error.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          fullError: error
        });
        
        // Handle specific error codes
        if (error.code === 'ALREADY_ENROLLED' || error.message?.includes('already enrolled') || error.message?.includes('duplicate')) {
          setIsEnrolled(true);
          // Reload lessons and find next lesson to watch
          const { data: lessonsData } = await getCourseLessons(courseId);
          if (lessonsData) {
            setLessons(lessonsData);
            if (lessonsData.length > 0 && currentUser) {
              // Find next lesson to watch
              const { data: completedLessonIds } = await getCompletedLessons(courseId, currentUser.id);
              const completedIds = Array.isArray(completedLessonIds) ? completedLessonIds : [];
              
              let nextLesson: CourseLesson | null = null;
              
              if (course.is_sequential) {
                for (const lesson of lessonsData) {
                  const canAccess = await canAccessLesson(lesson.id, courseId, currentUser.id);
                  const isCompleted = completedIds.includes(lesson.id);
                  if (canAccess && !isCompleted) {
                    nextLesson = lesson;
                    break;
                  }
                }
              } else {
                for (const lesson of lessonsData) {
                  const isCompleted = completedIds.includes(lesson.id);
                  if (!isCompleted) {
                    nextLesson = lesson;
                    break;
                  }
                }
              }
              
              setSelectedLesson(nextLesson || lessonsData[0]);
            } else if (lessonsData.length > 0) {
              setSelectedLesson(lessonsData[0]);
            }
          }
        } else {
          // Only show alert if there's a meaningful error message
          const errorMessage = error.message || 
                              (error as any)?.message || 
                              (error as any)?.details;
          
          if (errorMessage && errorMessage !== '{}' && errorMessage.trim() !== '') {
            alert(`שגיאה בהרשמה: ${errorMessage}`);
          } else {
            // Silent fail for empty errors - might be RLS or other non-critical issues
            console.warn('Enrollment failed silently - might be permission issue or already enrolled');
          }
        }
      } else {
        setIsEnrolled(true);
        // Reload lessons and find next lesson to watch
        const { data: lessonsData } = await getCourseLessons(courseId);
        if (lessonsData) {
          setLessons(lessonsData);
          if (lessonsData.length > 0 && currentUser) {
            // Find next lesson to watch
            const { data: completedLessonIds } = await getCompletedLessons(courseId, currentUser.id);
            const completedIds: any[] = Array.isArray(completedLessonIds) ? completedLessonIds : [];
            
            let nextLesson: CourseLesson | null = null;
            
            if (course.is_sequential) {
              for (const lesson of lessonsData) {
                const canAccess = await canAccessLesson(lesson.id, courseId, currentUser.id);
                const isCompleted = completedIds.includes(lesson.id);
                if (canAccess && !isCompleted) {
                  nextLesson = lesson;
                  break;
                }
              }
            } else {
              for (const lesson of lessonsData) {
                const isCompleted = completedIds.includes(lesson.id);
                if (!isCompleted) {
                  nextLesson = lesson;
                  break;
                }
              }
            }
            
            setSelectedLesson(nextLesson || lessonsData[0]);
          } else if (lessonsData.length > 0) {
            setSelectedLesson(lessonsData[0]);
          }
        }
        alert('נרשמת לקורס בהצלחה!');
      }
    } catch (error: any) {
      console.error('Exception enrolling:', error);
      const errorMessage = error?.message || error?.details;
      if (errorMessage && errorMessage !== '{}' && errorMessage.trim() !== '') {
        alert(`שגיאה בהרשמה: ${errorMessage}`);
      } else {
        console.warn('Enrollment failed silently - might be permission issue');
      }
    } finally {
      setEnrolling(false);
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

  function formatDuration(minutes?: number) {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} שעות ${mins} דקות` : `${hours} שעות`;
  }

  if (loading || checkingEnrollment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">הקורס לא נמצא</p>
          <Link href="/courses" className="text-[#F52F8E] hover:underline">
            חזור לרשימת הקורסים
          </Link>
        </div>
      </div>
    );
  }

  // Show enrollment screen if not enrolled and not admin
  if (!isEnrolled && !isAdmin(currentUser)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/courses" className="text-[#F52F8E] hover:underline mb-6 inline-block">
            ← חזור לקורסים
          </Link>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-10 lg:p-12">
            {/* Course Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">{course.title}</h1>
              {course.description && (() => {
                // Strip HTML tags for truncation
                const textContent = course.description.replace(/<[^>]*>/g, '');
                const words = textContent.split(/\s+/);
                const shouldTruncate = words.length > 25;
                const truncatedText = shouldTruncate ? words.slice(0, 25).join(' ') : textContent;
                
                return (
                  <div className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto px-4 prose prose-lg max-w-none">
                    {shouldTruncate && !descriptionExpanded ? (
                      <>
                        <div 
                          className="inline"
                          dangerouslySetInnerHTML={{ __html: truncatedText + '...' }}
                          dir="rtl"
                        />
                        <button
                          onClick={() => setDescriptionExpanded(true)}
                          className="text-[#F52F8E] hover:text-[#E01E7A] font-medium mr-2 transition-colors"
                        >
                          המשך קריאה
                        </button>
                      </>
                    ) : (
                      <>
                        <div 
                          dangerouslySetInnerHTML={{ __html: course.description }}
                          dir="rtl"
                        />
                        {shouldTruncate && descriptionExpanded && (
                          <button
                            onClick={() => setDescriptionExpanded(false)}
                            className="block text-[#F52F8E] hover:text-[#E01E7A] font-medium mt-2 transition-colors"
                          >
                            הצג פחות
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Course Info Cards */}
            <div className="border-t border-gray-200 pt-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <Clock className="w-8 h-8 text-[#F52F8E] mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">משך הקורס</p>
                  <p className="text-xl font-bold text-gray-800">{course.duration_hours} שעות</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <Play className="w-8 h-8 text-[#F52F8E] mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">מספר שיעורים</p>
                  <p className="text-xl font-bold text-gray-800">{course.lessons_count} שיעורים</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                  <p className="text-sm text-gray-600 mb-2">רמת קושי</p>
                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold ${getDifficultyColor(course.difficulty)}`}>
                    {course.difficulty}
                  </span>
                </div>
              </div>

              {/* Price Display */}
              <div className="text-center mb-8">
                {course.is_premium_only ? (
                  <div className="inline-block px-8 py-4 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl shadow-sm">
                    <p className="text-amber-800 font-semibold text-lg">קורס זה זמין למשתמשי פרימיום בלבד</p>
                  </div>
                ) : course.is_free_for_premium ? (
                  isPremiumUser(currentUser) ? (
                    <div className="inline-block px-8 py-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl shadow-sm">
                      <p className="text-green-800 font-bold text-2xl">חינם לך (פרימיום)</p>
                      {course.price && course.price > 0 && (
                        <p className="text-green-600 text-sm mt-1">מחיר למנויים חינמיים: {course.price} ₪</p>
                      )}
                    </div>
                  ) : (
                    <div className="inline-block px-8 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-sm">
                      <p className="text-blue-800 font-bold text-2xl">{course.price} ₪</p>
                      <p className="text-blue-600 text-sm mt-1">חינם למנויי פרימיום</p>
                    </div>
                  )
                ) : course.is_free || !course.price || course.price === 0 ? (
                  <div className="inline-block px-8 py-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl shadow-sm">
                    <p className="text-green-800 font-bold text-2xl">חינם</p>
                  </div>
                ) : (
                  <div className="inline-block px-8 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-sm">
                    <p className="text-blue-800 font-bold text-2xl">{course.price} ₪</p>
                  </div>
                )}
              </div>

              {/* Enroll Button */}
              <div className="text-center pt-4">
                <ProtectedAction
                  requireAuth={true}
                  disabledMessage="התחבר כדי להירשם לקורס"
                >
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="px-10 py-4 bg-gradient-to-r from-[#F52F8E] to-pink-500 text-white rounded-xl hover:from-[#E01E7A] hover:to-pink-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    {enrolling ? 'נרשם...' : (course.is_free ? 'התחל ללמוד' : 'הירשם לקורס')}
                  </button>
                </ProtectedAction>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/courses" className="text-[#F52F8E] hover:underline mb-4 inline-block">
            ← חזור לקורסים
          </Link>
          <div className="flex flex-col md:flex-row gap-6">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full md:w-64 h-48 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full md:w-64 h-48 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{course.title.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded text-xs font-semibold ${getDifficultyColor(course.difficulty)}`}>
                  {course.difficulty}
                </span>
                {course.is_new && (
                  <span className="px-3 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                    חדש
                  </span>
                )}
                {course.is_recommended && (
                  <span className="px-3 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                    מומלץ
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">{course.title}</h1>
              {course.description && (() => {
                // Strip HTML tags for truncation
                const textContent = course.description.replace(/<[^>]*>/g, '');
                const words = textContent.split(/\s+/);
                const shouldTruncate = words.length > 25;
                const truncatedText = shouldTruncate ? words.slice(0, 25).join(' ') : textContent;
                
                return (
                  <div className="mb-4">
                    <div className="text-gray-600 leading-relaxed prose prose-sm max-w-none">
                      {shouldTruncate && !descriptionExpanded ? (
                        <>
                          <div 
                            className="inline"
                            dangerouslySetInnerHTML={{ __html: truncatedText + '...' }}
                            dir="rtl"
                          />
                          <button
                            onClick={() => setDescriptionExpanded(true)}
                            className="text-[#F52F8E] hover:text-[#E01E7A] font-medium mr-2 transition-colors"
                          >
                            המשך קריאה
                          </button>
                        </>
                      ) : (
                        <>
                          <div 
                            dangerouslySetInnerHTML={{ __html: course.description }}
                            dir="rtl"
                          />
                          {shouldTruncate && descriptionExpanded && (
                            <button
                              onClick={() => setDescriptionExpanded(false)}
                              className="block text-[#F52F8E] hover:text-[#E01E7A] font-medium mt-2 transition-colors"
                            >
                              הצג פחות
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration_hours} שעות</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  <span>{course.lessons_count} שיעורים</span>
                </div>
                {course.instructor_name && (
                  <div>
                    <span>מרצה: {course.instructor_name}</span>
                  </div>
                )}
                {course.is_free || (!course.price || course.price === 0 && !course.is_free_for_premium) ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">חינם</span>
                ) : course.is_free_for_premium ? (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                    {isPremiumUser(currentUser) ? 'חינם (פרימיום)' : `${course.price} ₪`}
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">{course.price} ₪</span>
                )}
              </div>
              {course.progress !== undefined && course.progress > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">התקדמות</span>
                    <span className="text-sm font-semibold text-gray-800">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#F52F8E] h-2 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 min-w-0">
          {/* Lessons List - Desktop Only */}
          <div className="hidden lg:block lg:w-[20%] xl:w-[22%] 2xl:w-80 flex-shrink">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:sticky lg:top-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">תוכן הקורס</h2>
              {(() => {
                console.log('Rendering course content - sections:', sections.length, 'lessons:', lessons.length);
                return null;
              })()}
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">אין שיעורים זמינים בקורס זה</p>
                  <p className="text-xs mt-2">השיעורים יופיעו כאן כאשר הם יועלו</p>
                </div>
              ) : sections && sections.length > 0 ? (
                // Display with sections (accordion)
                <div className="space-y-2">
                  {sections.map((section) => {
                    const sectionLessons = lessons.filter(lesson => lesson.section_id === section.id);
                    const isOpen = openSections.has(section.id);
                    console.log(`Section "${section.title}" (${section.id}): ${sectionLessons.length} lessons, isOpen: ${isOpen}`);
                    
                    return (
                      <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const newOpenSections = new Set(openSections);
                            if (isOpen) {
                              newOpenSections.delete(section.id);
                            } else {
                              newOpenSections.add(section.id);
                            }
                            setOpenSections(newOpenSections);
                          }}
                          className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-semibold text-gray-800 text-sm sm:text-base">{section.title}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          )}
                        </button>
                        
                        {isOpen && (
                          <div className="p-2 space-y-2">
                            {sectionLessons.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-2">אין שיעורים בחלק זה</p>
                            ) : (
                              sectionLessons.map((lesson) => {
                                const isCompleted = completedLessons.includes(lesson.id);
                                const canAccess = lessonAccessStatus.get(lesson.id) ?? true;
                                const isLocked = course.is_sequential && !canAccess;
                                const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
                                
                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => {
                                      if (!isLocked) {
                                        setSelectedLesson(lesson);
                                      }
                                    }}
                                    disabled={isLocked}
                                    className={`w-full text-right p-3 sm:p-4 rounded-lg border transition-all ${
                                      selectedLesson?.id === lesson.id
                                        ? 'border-[#F52F8E] bg-pink-50'
                                        : isLocked
                                        ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                    title={isLocked ? 'עליך לסיים את השיעור הקודם' : ''}
                                  >
                                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                          <span className="text-xs sm:text-sm font-semibold text-gray-500">
                                            שיעור {lessonIndex + 1}
                                          </span>
                                          {isCompleted && (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                          )}
                                          {isLocked && (
                                            <Lock className="w-4 h-4 text-gray-400" />
                                          )}
                                          {lesson.is_preview && (
                                            <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                              תצוגה מקדימה
                                            </span>
                                          )}
                                        </div>
                                        <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{lesson.title}</h3>
                                        {lesson.description && (
                                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                                        )}
                                        {lesson.duration_minutes && (
                                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 sm:mt-2">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatDuration(lesson.duration_minutes)}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-shrink-0">
                                        {selectedLesson?.id === lesson.id ? (
                                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                                        ) : isLocked ? (
                                          <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        ) : (
                                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Show lessons without section at the end */}
                  {lessons.filter(lesson => !lesson.section_id).length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-3 sm:p-4 bg-gray-50">
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">שיעורים נוספים</span>
                      </div>
                      <div className="p-2 space-y-2">
                        {lessons.filter(lesson => !lesson.section_id).map((lesson) => {
                          const isCompleted = completedLessons.includes(lesson.id);
                          const canAccess = lessonAccessStatus.get(lesson.id) ?? true;
                          const isLocked = course.is_sequential && !canAccess;
                          const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
                          
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => {
                                if (!isLocked) {
                                  setSelectedLesson(lesson);
                                }
                              }}
                              disabled={isLocked}
                              className={`w-full text-right p-3 sm:p-4 rounded-lg border transition-all ${
                                selectedLesson?.id === lesson.id
                                  ? 'border-[#F52F8E] bg-pink-50'
                                  : isLocked
                                  ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              title={isLocked ? 'עליך לסיים את השיעור הקודם' : ''}
                            >
                              <div className="flex items-start justify-between gap-2 sm:gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                    <span className="text-xs sm:text-sm font-semibold text-gray-500">
                                      שיעור {lessonIndex + 1}
                                    </span>
                                    {isCompleted && (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                    {isLocked && (
                                      <Lock className="w-4 h-4 text-gray-400" />
                                    )}
                                    {lesson.is_preview && (
                                      <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                        תצוגה מקדימה
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{lesson.title}</h3>
                                  {lesson.description && (
                                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                                  )}
                                  {lesson.duration_minutes && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 sm:mt-2">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDuration(lesson.duration_minutes)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-shrink-0">
                                  {selectedLesson?.id === lesson.id ? (
                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                                  ) : isLocked ? (
                                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                  ) : (
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Display without sections (backward compatibility)
              <div className="space-y-2">
                {lessons.map((lesson, index) => {
                  const isCompleted = completedLessons.includes(lesson.id);
                  const canAccess = lessonAccessStatus.get(lesson.id) ?? true;
                  const isLocked = course.is_sequential && !canAccess;
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        if (!isLocked) {
                          setSelectedLesson(lesson);
                        }
                      }}
                      disabled={isLocked}
                      className={`w-full text-right p-3 sm:p-4 rounded-lg border transition-all ${
                        selectedLesson?.id === lesson.id
                          ? 'border-[#F52F8E] bg-pink-50'
                          : isLocked
                          ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      title={isLocked ? 'עליך לסיים את השיעור הקודם' : ''}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-gray-500">
                              שיעור {index + 1}
                            </span>
                            {isCompleted && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {isLocked && (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                            {lesson.is_preview && (
                              <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                תצוגה מקדימה
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{lesson.title}</h3>
                          {lesson.description && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                          )}
                          {lesson.duration_minutes && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 sm:mt-2">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(lesson.duration_minutes)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {selectedLesson?.id === lesson.id ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          ) : (
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              )}
            </div>
          </div>

          {/* Lesson Content */}
          <div className="flex-1 min-w-0 lg:w-[60%] xl:w-[56%] 2xl:flex-1 flex-shrink">
            {selectedLesson ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {selectedLesson.is_preview && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">
                        תצוגה מקדימה
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      שיעור {lessons.findIndex(l => l.id === selectedLesson.id) + 1} מתוך {lessons.length}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">{selectedLesson.title}</h2>
                  {selectedLesson.description && (
                    <p className="text-gray-600 mb-4">{selectedLesson.description}</p>
                  )}
                </div>

                {selectedLesson.video_url ? (
                  <div className="mb-6">
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                      {(() => {
                        // Check if it's a YouTube URL
                        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                        const youtubeMatch = selectedLesson.video_url.match(youtubeRegex);
                        
                        // Check if it's a Vimeo URL
                        const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
                        const vimeoMatch = selectedLesson.video_url.match(vimeoRegex);
                        
                        if (youtubeMatch) {
                          // YouTube embed
                          const videoId = youtubeMatch[1];
                          return (
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={selectedLesson.title}
                            />
                          );
                        } else if (vimeoMatch) {
                          // Vimeo embed
                          const videoId = vimeoMatch[1];
                          return (
                            <iframe
                              src={`https://player.vimeo.com/video/${videoId}`}
                              className="w-full h-full"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                              title={selectedLesson.title}
                            />
                          );
                        } else {
                          // Direct video URL
                          return (
                            <video
                              src={selectedLesson.video_url}
                              controls
                              className="w-full h-full"
                              preload="metadata"
                            >
                              הדפדפן שלך לא תומך בנגן וידאו.
                            </video>
                          );
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">אין וידאו זמין לשיעור זה</p>
                    </div>
                  </div>
                )}

                {/* Key Points Section */}
                {selectedLesson.key_points && selectedLesson.key_points.length > 0 && (
                  <div className="mb-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-6 h-6 text-amber-500" />
                      <h2 className="text-xl font-bold text-gray-800">נקודות חשובות</h2>
                    </div>
                    <div className="space-y-4">
                      {selectedLesson.key_points.map((point: any, index: number) => (
                        <div key={index} className="bg-amber-50 border-r-4 border-amber-400 p-4 rounded-lg">
                          {point.url ? (
                            <a
                              href={point.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <h3 className="font-semibold text-gray-800 mb-2 hover:text-blue-600 transition-colors inline-flex items-center gap-2">
                                {point.title || `נקודה ${index + 1}`}
                                <ExternalLink className="w-4 h-4" />
                              </h3>
                              {point.description && (
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                  {point.description}
                                </p>
                              )}
                            </a>
                          ) : (
                            <>
                              <h3 className="font-semibold text-gray-800 mb-2">{point.title || `נקודה ${index + 1}`}</h3>
                              {point.description && (
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                  {point.description}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Q&A Section - Accordion */}
                {selectedLesson.qa_section && selectedLesson.qa_section.length > 0 && (
                  <div className="mb-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <HelpCircle className="w-6 h-6 text-blue-500" />
                      <h2 className="text-xl font-bold text-gray-800">שאלות ותשובות</h2>
                    </div>
                    <div className="space-y-2">
                      {selectedLesson.qa_section.map((qa: any, index: number) => {
                        const isOpen = openQaIndex === index;
                        return (
                          <div key={index} className="border border-blue-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setOpenQaIndex(isOpen ? null : index)}
                              className="w-full bg-blue-50 hover:bg-blue-100 p-4 flex items-center justify-between text-right transition-colors"
                            >
                              <div className="flex items-start gap-2 flex-1">
                                <span className="text-blue-500 font-semibold">ש:</span>
                                <span className="font-semibold text-gray-800">{qa.question}</span>
                              </div>
                              {isOpen ? (
                                <ChevronUp className="w-5 h-5 text-blue-500 flex-shrink-0 mr-2" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-blue-500 flex-shrink-0 mr-2" />
                              )}
                            </button>
                            {isOpen && qa.answer && (
                              <div className="p-4 bg-white border-t border-blue-200">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                  <span className="text-blue-600 font-medium">ת: </span>
                                  {qa.answer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mark Complete Button */}
                {currentUser && selectedLesson && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleMarkComplete}
                      disabled={markingComplete || completedLessons.includes(selectedLesson.id)}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                        completedLessons.includes(selectedLesson.id)
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      }`}
                    >
                      {markingComplete ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>מעבד...</span>
                        </>
                      ) : completedLessons.includes(selectedLesson.id) ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>השיעור הסתיים בהצלחה</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>סיימתי את השיעור</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Next Lesson Button */}
                {(() => {
                  const isCurrentCompleted = selectedLesson && completedLessons.includes(selectedLesson.id);
                  
                  // For sequential courses, only show if current lesson is completed
                  if (course?.is_sequential && !isCurrentCompleted) {
                    return (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                          <p className="text-sm text-amber-800">
                            <Lock className="w-4 h-4 inline-block ml-1" />
                            עליך לסיים את השיעור הנוכחי כדי לגשת לשיעור הבא
                          </p>
                        </div>
                      </div>
                    );
                  }
                  
                  // Show next lesson button if available
                  if (nextAvailableLesson) {
                    return (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => setSelectedLesson(nextAvailableLesson)}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F52F8E] to-pink-500 text-white rounded-lg hover:from-[#E01E7A] hover:to-pink-600 transition-all font-semibold shadow-md hover:shadow-lg"
                        >
                          <ArrowLeft className="w-5 h-5" />
                          <span>לשיעור הבא</span>
                        </button>
                        <p className="text-center text-sm text-gray-500 mt-2">
                          {nextAvailableLesson.title}
                        </p>
                      </div>
                    );
                  }
                  
                  return null;
                })()}

                {selectedLesson.content && (
                  <div className="prose max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-p:text-gray-700 prose-ul:text-gray-700 prose-li:text-gray-700">
                    <div
                      className="text-gray-700 leading-relaxed space-y-4"
                      dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                    />
                  </div>
                )}

                {!selectedLesson.video_url && !selectedLesson.content && (
                  <div className="text-center py-12 text-gray-500">
                    <p>תוכן השיעור יופיע כאן בקרוב</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-gray-600">בחר שיעור מהרשימה</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet for Course Content */}
      {mobileSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileSheetOpen(false)}
          />
          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            {/* Handle bar */}
            <div className="flex items-center justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
    </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">תוכן הקורס</h2>
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {(() => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[Mobile Sheet] Rendering content:', {
                    lessonsCount: lessons.length,
                    sectionsCount: sections?.length || 0,
                    sections: sections,
                    lessonsWithSectionId: lessons.filter(l => l.section_id).length
                  });
                }
                return null;
              })()}
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">אין שיעורים זמינים בקורס זה</p>
                </div>
              ) : sections && sections.length > 0 ? (
                // Display with sections (accordion)
                <div className="space-y-2">
                  {sections.map((section) => {
                    const sectionLessons = lessons.filter(lesson => lesson.section_id === section.id);
                    const isOpen = openSections.has(section.id);
                    
                    // Debug logging
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[Mobile Sheet] Section "${section.title}" (${section.id}): ${sectionLessons.length} lessons, isOpen: ${isOpen}`);
                    }
                    
                    return (
                      <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const newOpenSections = new Set(openSections);
                            if (isOpen) {
                              newOpenSections.delete(section.id);
                            } else {
                              newOpenSections.add(section.id);
                            }
                            setOpenSections(newOpenSections);
                          }}
                          className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-semibold text-gray-800 text-sm sm:text-base">{section.title}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          )}
                        </button>
                        
                        {isOpen && (
                          <div className="p-2 space-y-2">
                            {sectionLessons.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-2">אין שיעורים בחלק זה</p>
                            ) : (
                              sectionLessons.map((lesson) => {
                                const isCompleted = completedLessons.includes(lesson.id);
                                const canAccess = lessonAccessStatus.get(lesson.id) ?? true;
                                const isLocked = course.is_sequential && !canAccess;
                                const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
                                
                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => {
                                      if (!isLocked) {
                                        setSelectedLesson(lesson);
                                        setMobileSheetOpen(false);
                                      }
                                    }}
                                    disabled={isLocked}
                                    className={`w-full text-right p-3 sm:p-4 rounded-lg border transition-all ${
                                      selectedLesson?.id === lesson.id
                                        ? 'border-[#F52F8E] bg-pink-50'
                                        : isLocked
                                        ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                    title={isLocked ? 'עליך לסיים את השיעור הקודם' : ''}
                                  >
                                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                          <span className="text-xs sm:text-sm font-semibold text-gray-500">
                                            שיעור {lessonIndex + 1}
                                          </span>
                                          {isCompleted && (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                          )}
                                          {isLocked && (
                                            <Lock className="w-4 h-4 text-gray-400" />
                                          )}
                                          {lesson.is_preview && (
                                            <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                              תצוגה מקדימה
                                            </span>
                                          )}
                                        </div>
                                        <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{lesson.title}</h3>
                                        {lesson.description && (
                                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                                        )}
                                        {lesson.duration_minutes && (
                                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 sm:mt-2">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatDuration(lesson.duration_minutes)}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-shrink-0">
                                        {selectedLesson?.id === lesson.id ? (
                                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                                        ) : isLocked ? (
                                          <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        ) : (
                                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Show lessons without section at the end */}
                  {lessons.filter(lesson => !lesson.section_id).length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-3 sm:p-4 bg-gray-50">
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">שיעורים נוספים</span>
                      </div>
                      <div className="p-2 space-y-2">
                        {lessons.filter(lesson => !lesson.section_id).map((lesson) => {
                          const isCompleted = completedLessons.includes(lesson.id);
                          const canAccess = lessonAccessStatus.get(lesson.id) ?? true;
                          const isLocked = course.is_sequential && !canAccess;
                          const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
                          
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => {
                                if (!isLocked) {
                                  setSelectedLesson(lesson);
                                  setMobileSheetOpen(false);
                                }
                              }}
                              disabled={isLocked}
                              className={`w-full text-right p-3 sm:p-4 rounded-lg border transition-all ${
                                selectedLesson?.id === lesson.id
                                  ? 'border-[#F52F8E] bg-pink-50'
                                  : isLocked
                                  ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              title={isLocked ? 'עליך לסיים את השיעור הקודם' : ''}
                            >
                              <div className="flex items-start justify-between gap-2 sm:gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                    <span className="text-xs sm:text-sm font-semibold text-gray-500">
                                      שיעור {lessonIndex + 1}
                                    </span>
                                    {isCompleted && (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                    {isLocked && (
                                      <Lock className="w-4 h-4 text-gray-400" />
                                    )}
                                    {lesson.is_preview && (
                                      <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                        תצוגה מקדימה
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{lesson.title}</h3>
                                  {lesson.description && (
                                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                                  )}
                                  {lesson.duration_minutes && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 sm:mt-2">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDuration(lesson.duration_minutes)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-shrink-0">
                                  {selectedLesson?.id === lesson.id ? (
                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                                  ) : isLocked ? (
                                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                  ) : (
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Display without sections (backward compatibility)
                <div className="space-y-2">
                  {(() => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[Mobile Sheet] No sections found. Displaying ${lessons.length} lessons without sections.`);
                      console.log(`[Mobile Sheet] Sections state:`, sections);
                      console.log(`[Mobile Sheet] Lessons with section_id:`, lessons.filter(l => l.section_id).length);
                    }
                    return null;
                  })()}
                  {lessons.map((lesson, index) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const canAccess = lessonAccessStatus.get(lesson.id) ?? true;
                    const isLocked = course.is_sequential && !canAccess;
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedLesson(lesson);
                            setMobileSheetOpen(false);
                          }
                        }}
                        disabled={isLocked}
                        className={`w-full text-right p-3 sm:p-4 rounded-lg border transition-all ${
                          selectedLesson?.id === lesson.id
                            ? 'border-[#F52F8E] bg-pink-50'
                            : isLocked
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        title={isLocked ? 'עליך לסיים את השיעור הקודם' : ''}
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                              <span className="text-xs sm:text-sm font-semibold text-gray-500">
                                שיעור {index + 1}
                              </span>
                              {isCompleted && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {isLocked && (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                              {lesson.is_preview && (
                                <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  תצוגה מקדימה
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{lesson.title}</h3>
                            {lesson.description && (
                              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                            )}
                            {lesson.duration_minutes && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 sm:mt-2">
                                <Clock className="w-3 h-3" />
                                <span>{formatDuration(lesson.duration_minutes)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {selectedLesson?.id === lesson.id ? (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                            ) : isLocked ? (
                              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            ) : (
                              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Floating Button */}
      <button
        onClick={() => setMobileSheetOpen(true)}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 lg:hidden bg-[#F52F8E] text-white px-6 py-3 rounded-full shadow-lg hover:bg-[#E01E7A] transition-colors flex items-center gap-2"
      >
        <BookOpen className="w-5 h-5" />
        <span className="font-semibold">תוכן הקורס</span>
      </button>
    </div>
  );
}


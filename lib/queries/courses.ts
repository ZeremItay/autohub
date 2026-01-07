import { createServerClient } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  category: string;
  difficulty: 'מתחילים' | 'בינוני' | 'מתקדמים';
  duration_hours: number;
  lessons_count: number;
  is_recommended: boolean;
  is_new: boolean;
  instructor_name?: string;
  instructor_title?: string;
  instructor_avatar_url?: string;
  price?: number; // מחיר הקורס בשקלים
  is_premium_only?: boolean; // קורס לפרימיום בלבד
  is_free?: boolean; // קורס חינם
  is_free_for_premium?: boolean; // חינם לפרימיום - מנויים פרימיום מקבלים בחינם, מנויים חינמיים משלמים
  is_sequential?: boolean; // קורס היררכי - חייב לסיים שיעור לפני מעבר לשיעור הבא
  payment_url?: string; // קישור תשלום ספציפי לקורס זה מ-Sumit
  status?: 'draft' | 'published'; // סטטוס הקורס: draft (טיוטה) או published (מפורסם)
  created_at: string;
  updated_at: string;
  progress?: number; // Progress percentage for user
}

export interface CourseProgress {
  id: string;
  course_id: string;
  user_id: string;
  progress_percentage: number;
  last_accessed_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  status: 'enrolled' | 'completed' | 'cancelled';
  enrolled_at: string;
  completed_at?: string;
  payment_status: 'free' | 'paid' | 'pending';
  payment_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface QAItem {
  question: string;
  answer: string;
}

export interface KeyPoint {
  title: string;
  description: string;
  url?: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  section_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_url?: string;
  content?: string;
  duration_minutes?: number;
  lesson_order: number;
  is_preview: boolean;
  section_id?: string;
  qa_section?: QAItem[];
  key_points?: KeyPoint[];
  created_at: string;
  updated_at: string;
}

// Get all courses
export async function getAllCourses(userId?: string, includeDrafts: boolean = false) {
  const supabase = createServerClient();
  let query = supabase
    .from('courses')
    .select('*');
  
  // Only show published courses unless includeDrafts is true (for admins)
  // Check if status column exists by trying to filter (if column doesn't exist, this will fail gracefully)
  if (!includeDrafts) {
    try {
      query = query.eq('status', 'published');
    } catch (e) {
      // If status column doesn't exist yet, just return all courses
      // This allows the system to work before running the migration
      console.warn('Status column not found, returning all courses. Please run supabase-add-course-status.sql');
    }
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  // If error is about missing column, return all courses (backward compatibility)
  if (error && error.message && error.message.includes('status')) {
    console.warn('Status column not found, returning all courses. Please run supabase-add-course-status.sql');
    const { data: allData, error: allError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (allError || !allData) return { data: [], error: allError };
    // Continue with allData instead of data
    const finalData = allData;
    // Get user progress if userId provided
    if (userId) {
      const courseIds = finalData.map(c => c.id);
      const { data: progressData } = await supabase
        .from('course_progress')
        .select('course_id, progress_percentage')
        .eq('user_id', userId)
        .in('course_id', courseIds);
      
      const progressMap = new Map(
        progressData?.map(p => [p.course_id, p.progress_percentage]) || []
      );
      
      const coursesWithProgress = finalData.map(course => ({
        ...course,
        progress: progressMap.get(course.id) || 0
      }));
      
      return { data: Array.isArray(coursesWithProgress) ? coursesWithProgress : [], error: null };
    }
    
    return { data: Array.isArray(finalData) ? finalData : [], error: null };
  }
  
  if (error || !data) return { data: [], error };
  
  // Get user progress if userId provided
  if (userId) {
    const courseIds = data.map(c => c.id);
    const { data: progressData } = await supabase
      .from('course_progress')
      .select('course_id, progress_percentage')
      .eq('user_id', userId)
      .in('course_id', courseIds);
    
    const progressMap = new Map(
      progressData?.map(p => [p.course_id, p.progress_percentage]) || []
    );
    
    const coursesWithProgress = data.map(course => ({
      ...course,
      progress: progressMap.get(course.id) || 0
    }));
    
    return { data: Array.isArray(coursesWithProgress) ? coursesWithProgress : [], error: null };
  }
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Get courses by category
export async function getCoursesByCategory(category: string, userId?: string, includeDrafts: boolean = false) {
  const supabase = createServerClient();
  let query = supabase
    .from('courses')
    .select('*')
    .eq('category', category);
  
  // Only show published courses unless includeDrafts is true (for admins)
  if (!includeDrafts) {
    try {
      query = query.eq('status', 'published');
    } catch (e) {
      // If status column doesn't exist yet, just return all courses
      console.warn('Status column not found, returning all courses. Please run supabase-add-course-status.sql');
    }
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  // If error is about missing column, return all courses (backward compatibility)
  if (error && error.message && error.message.includes('status')) {
    console.warn('Status column not found, returning all courses. Please run supabase-add-course-status.sql');
    const { data: allData, error: allError } = await supabase
      .from('courses')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    if (allError || !allData) return { data: [], error: allError };
    // Continue with allData instead of data
    const finalData = allData;
    // Get user progress if userId provided
    if (userId) {
      const courseIds = finalData.map(c => c.id);
      const { data: progressData } = await supabase
        .from('course_progress')
        .select('course_id, progress_percentage')
        .eq('user_id', userId)
        .in('course_id', courseIds);
      
      const progressMap = new Map(
        progressData?.map(p => [p.course_id, p.progress_percentage]) || []
      );
      
      const coursesWithProgress = finalData.map(course => ({
        ...course,
        progress: progressMap.get(course.id) || 0
      }));
      
      return { data: Array.isArray(coursesWithProgress) ? coursesWithProgress : [], error: null };
    }
    
    return { data: Array.isArray(finalData) ? finalData : [], error: null };
  }
  
  if (error || !data) return { data: [], error };
  
  // Get user progress if userId provided
  if (userId) {
    const courseIds = data.map(c => c.id);
    const { data: progressData } = await supabase
      .from('course_progress')
      .select('course_id, progress_percentage')
      .eq('user_id', userId)
      .in('course_id', courseIds);
    
    const progressMap = new Map(
      progressData?.map(p => [p.course_id, p.progress_percentage]) || []
    );
    
    const coursesWithProgress = data.map(course => ({
      ...course,
      progress: progressMap.get(course.id) || 0
    }));
    
    return { data: Array.isArray(coursesWithProgress) ? coursesWithProgress : [], error: null };
  }
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Get courses in progress (user has started)
export async function getCoursesInProgress(userId: string) {
  const supabase = createServerClient();
  const { data: progressData, error: progressError } = await supabase
    .from('course_progress')
    .select(`
      *,
      courses(*)
    `)
    .eq('user_id', userId)
    .gt('progress_percentage', 0)
    .lt('progress_percentage', 100)
    .order('last_accessed_at', { ascending: false });
  
  if (progressError || !progressData) return { data: [], error: progressError };
  
  const courses = progressData.map((item: any) => ({
    ...item.courses,
    progress: item.progress_percentage
  }));
  
  return { data: Array.isArray(courses) ? courses : [], error: null };
}

// Get course by ID
export async function getCourseById(courseId: string, userId?: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
  
  if (error) return { data: null, error };
  
  // Get user progress if userId provided
  if (userId) {
    const { data: progressData } = await supabase
      .from('course_progress')
      .select('progress_percentage')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .single();
    
    return {
      data: {
        ...data,
        progress: progressData?.progress_percentage || 0
      },
      error: null
    };
  }
  
  return { data, error: null };
}

// Create course
export async function createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>) {
  // Use client-side supabase for admin operations (similar to createRecording)
  // Set default values for required fields that user doesn't need to fill
  
  // Try English difficulty first (most common), fallback to Hebrew if needed
  let difficulty = 'beginner'; // Default to English
  
  // If course.difficulty is provided and valid, use it
  if (course.difficulty) {
    // Check if it's a valid Hebrew value
    if (course.difficulty === 'מתחילים' || course.difficulty === 'בינוני' || course.difficulty === 'מתקדמים') {
      difficulty = course.difficulty;
    }
    // Check if it's a valid English value
    else if (course.difficulty === 'beginner' || course.difficulty === 'intermediate' || course.difficulty === 'advanced') {
      difficulty = course.difficulty;
    }
  }
  
  const courseData: any = {
    title: String(course.title || '').trim(),
    description: String(course.description || '').trim(),
    category: String(course.category || 'כללי').trim(),
    difficulty: difficulty,
    duration_hours: Number(course.duration_hours || 1),
    lessons_count: Number(course.lessons_count || 0),
    is_recommended: Boolean(course.is_recommended ?? false),
    is_new: Boolean(course.is_new ?? false),
    price: course.price !== undefined ? (course.price > 0 ? Number(course.price) : null) : null,
    is_premium_only: Boolean(course.is_premium_only ?? false),
    is_free: course.is_free !== undefined ? Boolean(course.is_free) : (course.price === undefined || course.price === null || course.price === 0) && !course.is_free_for_premium,
    is_free_for_premium: Boolean(course.is_free_for_premium ?? false),
    is_sequential: Boolean(course.is_sequential ?? false),
    status: (course.status === 'draft' || course.status === 'published') ? course.status : 'published' // Default to published if not specified
  };
  
  // Add optional fields only if they exist
  if (course.thumbnail_url) courseData.thumbnail_url = course.thumbnail_url
  if (course.instructor_name) courseData.instructor_name = course.instructor_name
  if (course.instructor_title) courseData.instructor_title = course.instructor_title
  if (course.instructor_avatar_url) courseData.instructor_avatar_url = course.instructor_avatar_url
  if (course.payment_url) courseData.payment_url = course.payment_url
  
  console.log('Inserting course - difficulty:', JSON.stringify(courseData.difficulty))
  
  // First, check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error('User not authenticated:', sessionError);
    return { data: null, error: { message: 'User not authenticated', code: 'AUTH_ERROR' } };
  }
  
  console.log('User authenticated:', session.user.id);
  
  // Insert the course - try with current difficulty value
  try {
    let { data: insertData, error: insertError } = await supabase
      .from('courses')
      .insert([courseData])
      .select();
    
    // If error is about difficulty constraint, try the other language
    if (insertError && insertError.message && insertError.message.includes('difficulty_check')) {
      console.log('Difficulty constraint error detected, trying alternative difficulty values...');
      
      // Try the opposite language
      const alternativeDifficulties = {
        'beginner': 'מתחילים',
        'intermediate': 'בינוני',
        'advanced': 'מתקדמים',
        'מתחילים': 'beginner',
        'בינוני': 'intermediate',
        'מתקדמים': 'advanced'
      };
      
      const alternativeDifficulty = alternativeDifficulties[difficulty as keyof typeof alternativeDifficulties];
      if (alternativeDifficulty) {
        console.log(`Trying alternative difficulty: ${alternativeDifficulty}`);
        courseData.difficulty = alternativeDifficulty;
        
        // Retry with alternative difficulty
        const retryResult = await supabase
          .from('courses')
          .insert([courseData])
          .select();
        
        insertData = retryResult.data;
        insertError = retryResult.error;
      }
    }
    
    if (insertError) {
      // Log everything we can about the error
      console.error('=== SUPABASE ERROR ===');
      console.error('Error:', insertError);
      console.error('Error type:', typeof insertError);
      console.error('Error keys:', insertError ? Object.keys(insertError) : 'no keys');
      
      // Try to extract message
      const errorMessage = insertError.message || 
                          (insertError as any)?.message || 
                          String(insertError) || 
                          'שגיאה לא ידועה ביצירת הקורס';
      
      const errorCode = insertError.code || 
                       (insertError as any)?.code || 
                       'UNKNOWN';
      
      const errorDetails = insertError.details || 
                          (insertError as any)?.details || 
                          null;
      
      const errorHint = insertError.hint || 
                       (insertError as any)?.hint || 
                       null;
      
      console.error('Error message:', errorMessage);
      console.error('Error code:', errorCode);
      console.error('Error details:', errorDetails);
      console.error('Error hint:', errorHint);
      console.error('Full error stringified:', JSON.stringify(insertError, Object.getOwnPropertyNames(insertError)));
      console.error('=== END ERROR ===');
      
      return { 
        data: null, 
        error: { 
          message: errorMessage, 
          code: errorCode,
          details: errorDetails,
          hint: errorHint
        } 
      };
    }
    
    if (!insertData || insertData.length === 0) {
      console.error('No data returned from insert');
      return { data: null, error: { message: 'No data returned from insert', code: 'NO_DATA' } };
    }
    
    console.log('Course created successfully:', insertData[0].id);
    return { data: insertData[0], error: null };
    
  } catch (e: any) {
    console.error('Exception during course insert:', e);
    return { 
      data: null, 
      error: { 
        message: e?.message || 'Exception during course creation', 
        code: 'EXCEPTION' 
      } 
    };
  }
}

// Update course
export async function updateCourse(id: string, updates: Partial<Course>) {
  // Use client-side supabase for admin operations
  // Handle difficulty value - try English first, fallback to Hebrew if needed
  let difficulty = updates.difficulty || 'beginner';
  
  // If difficulty is provided, validate it
  if (updates.difficulty) {
    // Check if it's a valid Hebrew value
    if (updates.difficulty === 'מתחילים' || updates.difficulty === 'בינוני' || updates.difficulty === 'מתקדמים') {
      difficulty = updates.difficulty;
    }
    // Check if it's a valid English value
    else if (updates.difficulty === 'beginner' || updates.difficulty === 'intermediate' || updates.difficulty === 'advanced') {
      difficulty = updates.difficulty;
    }
  }
  
  const updateData: any = {
    ...updates,
    difficulty: difficulty,
    updated_at: new Date().toISOString()
  };
  
  // Ensure is_sequential is boolean
  if (updates.is_sequential !== undefined) {
    updateData.is_sequential = Boolean(updates.is_sequential);
  }
  
  // Remove fields that shouldn't be updated
  delete updateData.id;
  delete updateData.created_at;
  
  console.log('Updating course:', id, 'with data:', JSON.stringify(updateData, null, 2));
  
  const { data, error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    // If error is about difficulty constraint, try the other language
    if (error.message && error.message.includes('difficulty_check')) {
      console.log('Difficulty constraint error detected, trying alternative difficulty values...');
      
      const alternativeDifficulties: Record<string, string> = {
        'beginner': 'מתחילים',
        'intermediate': 'בינוני',
        'advanced': 'מתקדמים',
        'מתחילים': 'beginner',
        'בינוני': 'intermediate',
        'מתקדמים': 'advanced'
      };
      
      const alternativeDifficulty = alternativeDifficulties[difficulty];
      if (alternativeDifficulty) {
        console.log(`Trying alternative difficulty: ${alternativeDifficulty}`);
        updateData.difficulty = alternativeDifficulty;
        
        // Retry with alternative difficulty
        const retryResult = await supabase
          .from('courses')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        return { data: retryResult.data, error: retryResult.error };
      }
    }
    
    console.error('Error updating course:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Get sections for a course
export async function getCourseSections(courseId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
      console.log('Using client-side supabase for getCourseSections');
    } else {
      supabaseClient = createServerClient();
      console.log('Using server-side supabase for getCourseSections');
    }
  } catch (e) {
    console.error('Error initializing supabase client for getCourseSections:', e);
    supabaseClient = createServerClient();
  }
  
  console.log('Fetching sections for course:', courseId);
  
  try {
    const { data, error } = await supabaseClient
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('section_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching sections:', error);
      // If table doesn't exist, return empty array (backward compatibility)
      if (error.message?.includes('does not exist')) {
        console.warn('course_sections table does not exist, returning empty array');
        return { data: [], error: null };
      }
      return { data: null, error };
    }
    
    console.log(`Found ${data?.length || 0} sections for course ${courseId}`);
    if (data && data.length > 0) {
      console.log('Sections data:', data);
    }
    
    return { data: data || [], error: null };
  } catch (e: any) {
    console.error('Exception in getCourseSections:', e);
    // If table doesn't exist, return empty array (backward compatibility)
    return { data: [], error: null };
  }
}

// Create a course section
export async function createCourseSection(section: Omit<CourseSection, 'id' | 'created_at' | 'updated_at'>) {
  let supabaseClient;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Try to use client-side supabase
      try {
        const { supabase: clientSupabase } = await import('@/lib/supabase');
        supabaseClient = clientSupabase;
      } catch (e) {
        console.warn('Failed to import client supabase, using server client');
        supabaseClient = createServerClient();
      }
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    // Fallback to server client
    supabaseClient = createServerClient();
  }
  
  if (!supabaseClient) {
    console.error('Failed to initialize supabase client');
    return { data: null, error: { message: 'Failed to initialize supabase client' } as any };
  }
  
  console.log('Creating section:', section);
  
  const sectionData: any = {
    course_id: section.course_id,
    title: section.title,
    section_order: section.section_order
  };
  
  try {
    const { data, error } = await supabaseClient
      .from('course_sections')
      .insert([sectionData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating section:', error);
      console.error('Error details:', {
        message: error.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      console.error('Section data:', sectionData);
      return { data: null, error };
    }
    
    console.log('Section created successfully:', data?.id);
    
    return { data, error: null };
  } catch (e: any) {
    console.error('Exception creating section:', e);
    return { data: null, error: { message: e?.message || 'Unknown error' } as any };
  }
}

// Get lessons for a course
export async function getCourseLessons(courseId: string) {
  // Try to use client-side supabase first (for client components)
  // Fall back to server client if needed
  let supabaseClient;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
      console.log('Using client-side supabase for getCourseLessons');
    } else {
      supabaseClient = createServerClient();
      console.log('Using server-side supabase for getCourseLessons');
    }
  } catch (e) {
    console.error('Error initializing supabase client:', e);
    // Fallback to server client
    supabaseClient = createServerClient();
  }
  
  console.log('Loading lessons for course:', courseId);
  
  try {
    const { data, error } = await supabaseClient
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('lesson_order', { ascending: true });
    
    // Ensure qa_section and key_points are arrays
    if (data && !error) {
      data.forEach((lesson: any) => {
        if (!lesson.qa_section) lesson.qa_section = [];
        if (!lesson.key_points) lesson.key_points = [];
      });
    }
    
    if (error) {
      console.error('=== ERROR LOADING COURSE LESSONS ===');
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error message:', error?.message || 'No message');
      console.error('Error code:', (error as any)?.code || 'No code');
      console.error('Error details:', (error as any)?.details || 'No details');
      console.error('Error hint:', (error as any)?.hint || 'No hint');
      console.error('Full error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('Course ID:', courseId);
      console.error('=== END ERROR ===');
      return { data: null, error };
    }
    
    console.log(`Loaded ${data?.length || 0} lessons for course ${courseId}`);
    if (data && data.length > 0) {
      console.log('Lessons data:', data);
    }
    
    return { data, error: null };
  } catch (e: any) {
    console.error('=== EXCEPTION IN getCourseLessons ===');
    console.error('Exception:', e);
    console.error('Exception message:', e?.message || 'No message');
    console.error('Exception stack:', e?.stack || 'No stack');
    console.error('Course ID:', courseId);
    console.error('=== END EXCEPTION ===');
    return { 
      data: null, 
      error: { 
        message: e?.message || 'Unknown error loading lessons',
        code: 'EXCEPTION'
      } as any
    };
  }
}

// Get lesson by ID
export async function getLessonById(lessonId: string) {
  // Try to use client-side supabase first (for client components)
  // Fall back to server client if needed
  let supabaseClient;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    // Fallback to server client
    supabaseClient = createServerClient();
  }
  
  const { data, error } = await supabaseClient
    .from('course_lessons')
    .select('*')
    .eq('id', lessonId)
    .single();
  
  // Ensure qa_section and key_points are arrays
  if (data && !error) {
    if (!data.qa_section) data.qa_section = [];
    if (!data.key_points) data.key_points = [];
  }
  
  return { data, error };
}

// Create lesson
export async function createLesson(lesson: Omit<CourseLesson, 'id' | 'created_at' | 'updated_at'>) {
  // Try to use client-side supabase first (for client components)
  // Fall back to server client if needed
  let supabaseClient;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    // Fallback to server client
    supabaseClient = createServerClient();
  }
  
  console.log('Creating lesson:', lesson);
  
  const lessonData: any = {
    ...lesson,
    qa_section: lesson.qa_section || [],
    key_points: lesson.key_points || []
  };
  
  const { data, error } = await supabaseClient
    .from('course_lessons')
    .insert([lessonData])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating lesson:', error);
    console.error('Error details:', {
      message: error.message,
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    console.error('Lesson data:', lessonData);
    return { data: null, error };
  }
  
  console.log('Lesson created successfully:', data?.id);
  
  return { data, error: null };
}

// Update lesson
export async function updateLesson(lessonId: string, updates: Partial<CourseLesson>) {
  // Try to use client-side supabase first (for client components)
  // Fall back to server client if needed
  let supabaseClient;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    // Fallback to server client
    supabaseClient = createServerClient();
  }
  
  console.log('Updating lesson:', lessonId, updates);
  
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  // Ensure qa_section and key_points are arrays if provided
  if (updates.qa_section !== undefined) {
    updateData.qa_section = updates.qa_section || [];
  }
  if (updates.key_points !== undefined) {
    updateData.key_points = updates.key_points || [];
  }
  
  // Remove fields that shouldn't be updated
  delete updateData.id;
  delete updateData.course_id;
  delete updateData.created_at;
  
  const { data, error } = await supabaseClient
    .from('course_lessons')
    .update(updateData)
    .eq('id', lessonId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating lesson:', error);
    console.error('Update data:', updateData);
    return { data: null, error };
  }
  
  console.log('Lesson updated successfully:', data?.id);
  
  return { data, error: null };
}

// Delete lesson
export async function deleteLesson(lessonId: string) {
  // Try to use client-side supabase first (for client components)
  // Fall back to server client if needed
  let supabaseClient;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    // Fallback to server client
    supabaseClient = createServerClient();
  }
  
  console.log('Deleting lesson:', lessonId);
  
  const { error } = await supabaseClient
    .from('course_lessons')
    .delete()
    .eq('id', lessonId);
  
  if (error) {
    console.error('Error deleting lesson:', error);
    console.error('Lesson ID:', lessonId);
    return { error };
  }
  
  console.log('Lesson deleted successfully:', lessonId);
  
  return { error: null };
}

// Delete course
export async function deleteCourse(id: string) {
  // Try to use client-side supabase first (for client components)
  // Fall back to server client if needed
  let supabaseClient;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
      console.log('Using client-side supabase for deleteCourse');
    } else {
      supabaseClient = createServerClient();
      console.log('Using server-side supabase for deleteCourse');
    }
  } catch (e) {
    console.error('Error initializing supabase client:', e);
    // Fallback to server client
    supabaseClient = createServerClient();
  }
  
  console.log('Deleting course:', id);
  
  try {
    const { error } = await supabaseClient
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('=== ERROR DELETING COURSE ===');
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error message:', error?.message || 'No message');
      console.error('Error code:', (error as any)?.code || 'No code');
      console.error('Error details:', (error as any)?.details || 'No details');
      console.error('Error hint:', (error as any)?.hint || 'No hint');
      console.error('Full error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('Course ID:', id);
      console.error('=== END ERROR ===');
      return { error };
    }
    
    console.log('Course deleted successfully:', id);
    return { error: null };
  } catch (e: any) {
    console.error('=== EXCEPTION IN deleteCourse ===');
    console.error('Exception:', e);
    console.error('Exception message:', e?.message || 'No message');
    console.error('Exception stack:', e?.stack || 'No stack');
    console.error('Course ID:', id);
    console.error('=== END EXCEPTION ===');
    return { 
      error: { 
        message: e?.message || 'Unknown error deleting course',
        code: 'EXCEPTION'
      } as any
    };
  }
}

// Update course progress
export async function updateCourseProgress(courseId: string, userId: string, progress: number) {
  const supabase = createServerClient();
  
  // Check if progress exists
  const { data: existing } = await supabase
    .from('course_progress')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .single();
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('course_progress')
      .update({
        progress_percentage: progress,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    return { data, error };
  } else {
    // Create new
    const { data, error } = await supabase
      .from('course_progress')
      .insert([{
        course_id: courseId,
        user_id: userId,
        progress_percentage: progress,
        last_accessed_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    return { data, error };
  }
}

// ============================================
// ENROLLMENT FUNCTIONS
// ============================================

// Check if user is enrolled in a course
export async function checkEnrollment(courseId: string, userId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  // Get current session to use authenticated user ID (ensures RLS works correctly)
  const { data: { session } } = await supabaseClient.auth.getSession();
  const authenticatedUserId = session?.user?.id;
  
  // Use authenticatedUserId if available, otherwise fall back to userId parameter
  const userIdToCheck = authenticatedUserId || userId;
  
  const { data, error } = await supabaseClient
    .from('course_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userIdToCheck)
    .maybeSingle();
  
  return { data, error };
}

// Enroll user in a course
export async function enrollInCourse(courseId: string, userId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  // Get current session to verify auth.uid() matches userId
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return { 
      data: null, 
      error: { message: 'User not authenticated', code: 'AUTH_ERROR' } as any 
    };
  }
  
  // Use auth.uid() from session to ensure RLS policy works
  const authenticatedUserId = session.user.id;
  
  // Verify that userId matches authenticated user (unless admin)
  // For now, we'll use authenticatedUserId to ensure RLS works
  // In the future, we can add admin check here
  
  // Check if already enrolled
  const { data: existing } = await checkEnrollment(courseId, authenticatedUserId);
  if (existing) {
    return { 
      data: existing, 
      error: { message: 'User already enrolled in this course', code: 'ALREADY_ENROLLED' } as any 
    };
  }
  
  // Get course to determine payment status
  const { data: course } = await getCourseById(courseId);
  
  // Check if user is premium
  const { data: userProfile } = await supabaseClient
    .from('profiles')
    .select('role_id, roles:role_id (name)')
    .eq('user_id', authenticatedUserId)
    .maybeSingle();
  
  const userRole = (userProfile?.roles as any)?.[0]?.name || (userProfile?.roles as any)?.name;
  const isPremium = userRole === 'premium' || userRole === 'admin';
  
  // Check if course is premium only and user is not premium
  if (course?.is_premium_only && !isPremium) {
    return {
      data: null,
      error: { message: 'קורס זה זמין למשתמשי פרימיום בלבד', code: 'PREMIUM_ONLY' } as any
    };
  }
  
  // Determine payment status
  let paymentStatus: 'free' | 'paid' | 'pending' = 'pending';
  let paymentAmount: number | null = null;
  
  if (course?.is_free) {
    paymentStatus = 'free';
  } else if (course?.is_free_for_premium && isPremium) {
    // Free for premium users
    paymentStatus = 'free';
  } else if (course?.price && course.price > 0) {
    // Paid course (for free users, or if not free_for_premium)
    paymentStatus = 'paid';
    paymentAmount = course.price;
  } else {
    // Default to free if no price set
    paymentStatus = 'free';
  }
  
  // Create enrollment - use authenticatedUserId to ensure RLS policy works
  const enrollmentData = {
    course_id: courseId,
    user_id: authenticatedUserId, // Use auth.uid() instead of userId parameter
    status: 'enrolled',
    payment_status: paymentStatus,
    payment_amount: paymentAmount
  };
  
  console.log('Attempting to enroll:', { courseId, userId, authenticatedUserId, enrollmentData });
  
  const { data, error } = await supabaseClient
    .from('course_enrollments')
    .insert([enrollmentData])
    .select()
    .single();
  
  if (error) {
    console.error('=== ERROR ENROLLING IN COURSE ===');
    console.error('Error object:', error);
    console.error('Error type:', typeof error);
    console.error('Error keys:', Object.keys(error || {}));
    console.error('Error message:', error?.message || 'No message');
    console.error('Error code:', (error as any)?.code || 'No code');
    console.error('Error details:', (error as any)?.details || 'No details');
    console.error('Error hint:', (error as any)?.hint || 'No hint');
    console.error('Full error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('Course ID:', courseId);
    console.error('User ID:', userId);
    console.error('=== END ERROR ===');
    return { data: null, error };
  }
  
  // Create or update course progress
  await updateCourseProgress(courseId, authenticatedUserId, 0);
  
  return { data, error: null };
}

// Get all enrollments for a user
export async function getUserEnrollments(userId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  const { data, error } = await supabaseClient
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });
  
  return { data, error };
}

// Get all courses a user is enrolled in (with course details)
export async function getEnrolledCourses(userId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  const { data: enrollments, error: enrollmentsError } = await supabaseClient
    .from('course_enrollments')
    .select(`
      *,
      courses (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'enrolled')
    .order('enrolled_at', { ascending: false });
  
  if (enrollmentsError || !enrollments) {
    return { data: [], error: enrollmentsError };
  }
  
  // Get progress for each course
  const courseIds = enrollments.map((e: any) => e.course_id);
  const { data: progressData } = await supabaseClient
    .from('course_progress')
    .select('course_id, progress_percentage')
    .eq('user_id', userId)
    .in('course_id', courseIds);
  
  const progressMap = new Map(
    progressData?.map((p: any) => [p.course_id, p.progress_percentage]) || []
  );
  
  const courses = enrollments.map((enrollment: any) => ({
    ...enrollment.courses,
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      enrolled_at: enrollment.enrolled_at,
      completed_at: enrollment.completed_at
    },
    progress: progressMap.get(enrollment.course_id) || 0
  }));
  
  return { data: Array.isArray(courses) ? courses : [], error: null };
}

// Update enrollment status
export async function updateEnrollmentStatus(enrollmentId: string, status: 'enrolled' | 'completed' | 'cancelled') {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }
  
  const { data, error } = await supabaseClient
    .from('course_enrollments')
    .update(updateData)
    .eq('id', enrollmentId)
    .select()
    .single();
  
  return { data, error };
}

// ============================================
// LESSON COMPLETION FUNCTIONS
// ============================================

// Mark a lesson as completed
export async function markLessonComplete(lessonId: string, courseId: string, userId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  // Get current session to verify auth.uid() matches userId
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return { 
      data: null, 
      error: { message: 'User not authenticated', code: 'AUTH_ERROR' } as any 
    };
  }
  
  // Use auth.uid() from session to ensure RLS policy works
  const authenticatedUserId = session.user.id;
  
  console.log('=== markLessonComplete ===');
  console.log('lessonId:', lessonId);
  console.log('courseId:', courseId);
  console.log('userId (parameter):', userId);
  console.log('authenticatedUserId (auth.uid()):', authenticatedUserId);
  
  // Check if already completed
  const { data: existing, error: checkError } = await supabaseClient
    .from('lesson_completions')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('user_id', authenticatedUserId)
    .maybeSingle();
  
  if (checkError) {
    console.error('Error checking existing completion:', checkError);
    console.error('Error code:', (checkError as any)?.code);
    console.error('Error message:', (checkError as any)?.message);
    console.error('Error details:', (checkError as any)?.details);
    console.error('Error hint:', (checkError as any)?.hint);
    return { data: null, error: checkError };
  }
  
  if (existing) {
    // Already completed, just update the timestamp
    console.log('Lesson already completed, updating timestamp');
    const { data, error } = await supabaseClient
      .from('lesson_completions')
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating completion:', error);
      console.error('Error code:', (error as any)?.code);
      console.error('Error message:', (error as any)?.message);
      console.error('Error details:', (error as any)?.details);
      console.error('Error hint:', (error as any)?.hint);
    }
    
    return { data, error };
  }
  
  // Create new completion - use authenticatedUserId to ensure RLS policy works
  console.log('Creating new completion');
  const { data, error } = await supabaseClient
    .from('lesson_completions')
    .insert([{
      lesson_id: lessonId,
      course_id: courseId,
      user_id: authenticatedUserId, // Use auth.uid() instead of userId parameter
      completed_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating completion:', error);
    console.error('Error code:', (error as any)?.code);
    console.error('Error message:', (error as any)?.message);
    console.error('Error details:', (error as any)?.details);
    console.error('Error hint:', (error as any)?.hint);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  } else {
    console.log('Completion created successfully:', data);
  }
  
  console.log('=== END markLessonComplete ===');
  return { data, error };
}

// Mark a lesson as incomplete (remove completion)
export async function markLessonIncomplete(lessonId: string, userId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  // Get current session to verify auth.uid() matches userId
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return { 
      data: null, 
      error: { message: 'User not authenticated', code: 'AUTH_ERROR' } as any 
    };
  }
  
  // Use auth.uid() from session to ensure RLS policy works
  const authenticatedUserId = session.user.id;
  
  const { error } = await supabaseClient
    .from('lesson_completions')
    .delete()
    .eq('lesson_id', lessonId)
    .eq('user_id', authenticatedUserId); // Use auth.uid() instead of userId parameter
  
  return { data: null, error };
}

// Get all completed lessons for a course and user
export async function getCompletedLessons(courseId: string, userId: string) {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  // Get current session to verify auth.uid() matches userId
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return { 
      data: [], 
      error: { message: 'User not authenticated', code: 'AUTH_ERROR' } as any 
    };
  }
  
  // Use auth.uid() from session to ensure RLS policy works
  const authenticatedUserId = session.user.id;
  
  const { data, error } = await supabaseClient
    .from('lesson_completions')
    .select('lesson_id')
    .eq('course_id', courseId)
    .eq('user_id', authenticatedUserId); // Use auth.uid() instead of userId parameter
  
  if (error) {
    return { data: [], error };
  }
  
  // Return array of lesson IDs
  const lessonIds = data?.map(item => item.lesson_id) || [];
  return { data: Array.isArray(lessonIds) ? lessonIds : [], error: null };
}

// Check if a specific lesson is completed
export async function isLessonCompleted(lessonId: string, userId: string): Promise<boolean> {
  let supabaseClient;
  
  try {
    if (typeof window !== 'undefined') {
      supabaseClient = supabase;
    } else {
      supabaseClient = createServerClient();
    }
  } catch (e) {
    supabaseClient = createServerClient();
  }
  
  // Get current session to verify auth.uid() matches userId
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    return false;
  }
  
  // Use auth.uid() from session to ensure RLS policy works
  const authenticatedUserId = session.user.id;
  
  const { data, error } = await supabaseClient
    .from('lesson_completions')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('user_id', authenticatedUserId) // Use auth.uid() instead of userId parameter
    .maybeSingle();
  
  if (error || !data) {
    return false;
  }
  
  return true;
}

// Check if user can access a lesson (for sequential courses)
export async function canAccessLesson(lessonId: string, courseId: string, userId: string): Promise<boolean> {
  // Get course to check if it's sequential
  const { data: course, error: courseError } = await getCourseById(courseId);
  
  if (courseError || !course) {
    return false;
  }
  
  // If course is not sequential, all lessons are accessible
  if (!course.is_sequential) {
    return true;
  }
  
  // Get all lessons for the course
  const { data: lessons, error: lessonsError } = await getCourseLessons(courseId);
  
  if (lessonsError || !lessons || lessons.length === 0) {
    return false;
  }
  
  // Find the index of the current lesson
  const currentIndex = lessons.findIndex(l => l.id === lessonId);
  
  // First lesson is always accessible
  if (currentIndex === 0) {
    return true;
  }
  
  // If lesson not found, deny access
  if (currentIndex === -1) {
    return false;
  }
  
  // Check if previous lesson is completed
  const previousLesson = lessons[currentIndex - 1];
  const previousCompleted = await isLessonCompleted(previousLesson.id, userId);
  
  return previousCompleted;
}

// Get the next available lesson (for sequential courses)
export async function getNextAvailableLesson(courseId: string, userId: string, currentLessonIndex: number) {
  // Get course to check if it's sequential
  const { data: course, error: courseError } = await getCourseById(courseId);
  
  if (courseError || !course) {
    return null;
  }
  
  // Get all lessons for the course
  const { data: lessons, error: lessonsError } = await getCourseLessons(courseId);
  
  if (lessonsError || !lessons || lessons.length === 0) {
    return null;
  }
  
  // If course is not sequential, return next lesson if exists
  if (!course.is_sequential) {
    if (currentLessonIndex < lessons.length - 1) {
      return lessons[currentLessonIndex + 1];
    }
    return null;
  }
  
  // For sequential courses, find the next available lesson
  for (let i = currentLessonIndex + 1; i < lessons.length; i++) {
    const lesson = lessons[i];
    
    // First lesson is always accessible
    if (i === 0) {
      return lesson;
    }
    
    // Check if previous lesson is completed
    const previousLesson = lessons[i - 1];
    const previousCompleted = await isLessonCompleted(previousLesson.id, userId);
    
    if (previousCompleted) {
      return lesson;
    } else {
      // Can't access this lesson yet
      break;
    }
  }
  
  return null;
}


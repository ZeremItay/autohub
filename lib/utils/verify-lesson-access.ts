/**
 * Verify if a user can access a lesson
 * Checks enrollment, premium status, and sequential course requirements
 */

import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { canAccessLesson, checkEnrollment } from '@/lib/queries/courses';
import { verifyPremiumAccess } from './verify-premium-access';

export interface LessonAccessResult {
  hasAccess: boolean;
  reason: 'enrolled' | 'premium' | 'preview' | 'admin' | 'not_enrolled' | 'not_premium' | 'sequential_blocked' | 'none';
}

/**
 * Verify lesson access for a user
 * @param lessonId - The lesson ID to check
 * @param courseId - The course ID the lesson belongs to
 * @param userId - The user ID to check
 * @returns Object with hasAccess boolean and reason
 */
export async function verifyLessonAccess(
  lessonId: string,
  courseId: string,
  userId: string
): Promise<LessonAccessResult> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id, course_id, is_preview')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError || !lesson) {
      return { hasAccess: false, reason: 'none' };
    }

    // Preview lessons are accessible to everyone
    if (lesson.is_preview) {
      return { hasAccess: true, reason: 'preview' };
    }

    // Check if user is admin
    const premiumCheck = await verifyPremiumAccess(userId);
    if (premiumCheck.reason === 'admin_role') {
      return { hasAccess: true, reason: 'admin' };
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, is_free, is_sequential')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      return { hasAccess: false, reason: 'none' };
    }

    // Check enrollment first (required for all lessons)
    const { data: enrollment, error: enrollmentError } = await checkEnrollment(courseId, userId);
    
    if (enrollmentError || !enrollment) {
      return { hasAccess: false, reason: 'not_enrolled' };
    }

    // Free courses are accessible to enrolled users
    if (course.is_free) {
      // Check sequential requirements if course is sequential
      if (course.is_sequential) {
        const canAccess = await canAccessLesson(lessonId, courseId, userId);
        if (!canAccess) {
          return { hasAccess: false, reason: 'sequential_blocked' };
        }
      }
      return { hasAccess: true, reason: 'enrolled' };
    }

    // Premium courses require premium access
    if (!premiumCheck.hasAccess) {
      return { hasAccess: false, reason: 'not_premium' };
    }

    // Check sequential requirements if course is sequential
    if (course.is_sequential) {
      const canAccess = await canAccessLesson(lessonId, courseId, userId);
      if (!canAccess) {
        return { hasAccess: false, reason: 'sequential_blocked' };
      }
    }

    return { hasAccess: true, reason: 'premium' };
  } catch (error) {
    console.error('Error verifying lesson access:', error);
    return { hasAccess: false, reason: 'none' };
  }
}

/**
 * Simple boolean check for lesson access
 */
export async function hasLessonAccess(
  lessonId: string,
  courseId: string,
  userId: string
): Promise<boolean> {
  const result = await verifyLessonAccess(lessonId, courseId, userId);
  return result.hasAccess;
}

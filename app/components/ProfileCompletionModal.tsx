'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, CheckCircle, Circle, User, Image as ImageIcon, Link as LinkIcon, ArrowLeft, Sparkles } from 'lucide-react';
import { getProfileWithRole } from '@/lib/queries/profiles';
import { supabase } from '@/lib/supabase';

interface ProfileCompletionModalProps {
  userId: string;
  onClose?: () => void;
}

export default function ProfileCompletionModal({ userId, onClose }: ProfileCompletionModalProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  // Check completion status for each task
  const hasHeadline = profile?.headline && profile.headline.trim().length > 0;
  // Check if user has uploaded a custom avatar (not empty and not just initials)
  const hasCustomAvatar = profile?.avatar_url && 
    profile.avatar_url.trim().length > 0 &&
    !profile.avatar_url.startsWith('data:image/svg+xml'); // Exclude SVG avatars (dicebear default)
  const hasSocialLinks = profile?.social_links && 
    Array.isArray(profile.social_links) && 
    profile.social_links.length > 0;

  const allTasksComplete = hasHeadline && hasCustomAvatar && hasSocialLinks;
  const completedTasksCount = [hasHeadline, hasCustomAvatar, hasSocialLinks].filter(Boolean).length;

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        const profileData = await getProfileWithRole(userId);
        setProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  // Listen for profile update events
  useEffect(() => {
    if (!userId) return;

    const handleProfileUpdate = async () => {
      try {
        const profileData = await getProfileWithRole(userId);
        setProfile(profileData);
      } catch (error) {
        console.error('Error reloading profile:', error);
      }
    };

    const handleHeadlineUpdate = () => handleProfileUpdate();
    const handleAvatarUpdate = () => handleProfileUpdate();
    const handleSocialLinksUpdate = () => handleProfileUpdate();

    window.addEventListener('profileHeadlineUpdated', handleHeadlineUpdate);
    window.addEventListener('profileAvatarUpdated', handleAvatarUpdate);
    window.addEventListener('profileSocialLinksUpdated', handleSocialLinksUpdate);

    // Also listen to general profile update event
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileHeadlineUpdated', handleHeadlineUpdate);
      window.removeEventListener('profileAvatarUpdated', handleAvatarUpdate);
      window.removeEventListener('profileSocialLinksUpdated', handleSocialLinksUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [userId]);

  // Check if all tasks are complete and show completion message
  useEffect(() => {
    if (allTasksComplete && !showCompletion) {
      setShowCompletion(true);
      // Auto-close after 3 seconds
      setTimeout(() => {
        setIsOpen(false);
        if (onClose) onClose();
        // Mark as completed in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`profile_completed_${userId}`, 'true');
        }
      }, 3000);
    }
  }, [allTasksComplete, showCompletion, userId, onClose]);

  // Don't show modal if already completed
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading && profile) {
      const isCompleted = localStorage.getItem(`profile_completed_${userId}`) === 'true';
      if (isCompleted && allTasksComplete) {
        setIsOpen(false);
        if (onClose) onClose();
      }
    }
  }, [userId, allTasksComplete, onClose, loading, profile]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleNavigateToProfile = () => {
    router.push(`/profile?userId=${userId}`);
    handleClose();
  };

  const handleNavigateToAccount = () => {
    router.push('/account');
    handleClose();
  };

  if (!isOpen || loading) {
    return null;
  }

  // Don't show if all tasks are complete and user has seen completion message
  if (allTasksComplete && showCompletion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">כל הכבוד! 🎉</h2>
            <p className="text-gray-600 mb-6">השלמת את כל המשימות בהצלחה!</p>
            <p className="text-sm text-gray-500">הפרופיל שלך כעת מלא ומעודכן</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">השלמת פרטים</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              התקדמות: {completedTasksCount} מתוך 3
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((completedTasksCount / 3) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedTasksCount / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-6 space-y-4">
          {/* Task 1: Headline */}
          <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0 mt-1">
              {hasHeadline ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800">הוסף כותרת משנה</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                שתף עם הקהילה מה אתה עושה או מה התחביבים שלך
              </p>
              {!hasHeadline && (
                <button
                  onClick={handleNavigateToProfile}
                  className="text-sm text-[#F52F8E] hover:underline font-medium"
                >
                  עבור לפרופיל ←
                </button>
              )}
            </div>
          </div>

          {/* Task 2: Avatar */}
          <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0 mt-1">
              {hasCustomAvatar ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800">החלף תמונת פרופיל</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                הוסף תמונה אישית כדי שהקהילה תכיר אותך
              </p>
              {!hasCustomAvatar && (
                <button
                  onClick={handleNavigateToProfile}
                  className="text-sm text-[#F52F8E] hover:underline font-medium"
                >
                  עבור לפרופיל ←
                </button>
              )}
            </div>
          </div>

          {/* Task 3: Social Links */}
          <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0 mt-1">
              {hasSocialLinks ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800">הוסף רשתות חברתיות</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                שתף את הפרופילים שלך ברשתות החברתיות
              </p>
              {!hasSocialLinks && (
                <button
                  onClick={handleNavigateToAccount}
                  className="text-sm text-[#F52F8E] hover:underline font-medium"
                >
                  עבור להגדרות ←
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            תוכל לסגור את החלון הזה, אבל הוא יופיע שוב עד שתשלים את כל המשימות
          </p>
        </div>
      </div>
    </div>
  );
}

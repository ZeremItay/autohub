'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Bell, Lock, Download, Save, Upload, X, Camera, Eye, EyeOff } from 'lucide-react';
import { getProfileWithRole, updateProfile } from '@/lib/queries/profiles';
import { supabase } from '@/lib/supabase';

export default function AccountSettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'login' | 'notifications' | 'privacy' | 'export'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    display_name: '',
    bio: '',
    avatar_url: '',
    keepPasswordEmpty: true
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailPreferences, setEmailPreferences] = useState({
    forum_reply: true,
    new_project: true,
    mention: true
  });
  const [savingEmailPreferences, setSavingEmailPreferences] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    try {
      // Get the currently authenticated user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Error getting authenticated user:', authError);
        alert('שגיאה: לא ניתן לזהות את המשתמש המחובר. אנא התחבר מחדש.');
        return;
      }
      
      // Get user email from auth
      const userEmail = authUser.email;
      if (!userEmail) {
        console.error('No email found for authenticated user');
        alert('שגיאה: לא נמצא אימייל למשתמש המחובר.');
        return;
      }
      
      // Get profile directly by user_id (much more efficient)
      const { data: user, error: profileError } = await getProfileWithRole(authUser.id);
      
      if (profileError || !user) {
        console.error('User profile not found for authenticated user:', authUser.id, userEmail, profileError);
        alert('שגיאה: לא נמצא פרופיל למשתמש המחובר. אנא פנה לתמיכה.');
        return;
      }
      
      // Set the current user
      setCurrentUser(user);
      setFormData({
        email: userEmail || user.email || '',
        password: '',
        confirmPassword: '',
        display_name: user.display_name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        keepPasswordEmpty: true
      });
      // Add cache buster to avatar URL
      const avatarUrl = user.avatar_url || null;
      setAvatarPreview(avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : null);
      
      // Load email preferences only if user is logged in
      try {
        const prefsResponse = await fetch('/api/email-preferences', {
          credentials: 'include'
        });
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          if (prefsData.data) {
            setEmailPreferences({
              forum_reply: prefsData.data.forum_reply ?? true,
              new_project: prefsData.data.new_project ?? true,
              mention: prefsData.data.mention ?? true
            });
          }
        } else if (prefsResponse.status === 401) {
          // User not authenticated, use defaults silently
        }
      } catch (error) {
        console.error('Error loading email preferences:', error);
        // Use defaults if loading fails
      }
    } catch (error) {
      console.error('Error loading user:', error);
      alert('שגיאה בטעינת נתוני המשתמש. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  // Listen for profile updates from other users
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Clear cache and reload user data
      const { clearCache } = require('@/lib/cache');
      clearCache('profiles:all');
      // Only reload if we have a current user
      if (currentUser) {
        loadUser();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // Also poll for profile updates every 30 seconds to catch changes from other users
    // But only if we have a current user
    let pollInterval: NodeJS.Timeout | null = null;
    if (currentUser) {
      pollInterval = setInterval(() => {
        const { clearCache } = require('@/lib/cache');
        clearCache('profiles:all');
        loadUser();
      }, 30000); // Poll every 30 seconds
    }
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      if (pollInterval) clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id || currentUser?.id]); // Only depend on user ID, not entire object

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('אנא בחר קובץ תמונה בלבד');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('גודל הקובץ גדול מדי. מקסימום 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      if (!currentUser) return;

      const userId = currentUser.user_id || currentUser.id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If bucket doesn't exist, use public URL as fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAvatarPreview(base64);
          setFormData({ ...formData, avatar_url: base64 });
        };
        reader.readAsDataURL(file);
        setUploadingAvatar(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster to public URL
      const avatarUrlWithCache = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      setAvatarPreview(avatarUrlWithCache);
      setFormData({ ...formData, avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('שגיאה בהעלאת התמונה');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function removeAvatar() {
    setAvatarPreview(null);
    setFormData({ ...formData, avatar_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (!currentUser) return;

      const updates: any = {};
      
      if (formData.display_name) {
        updates.display_name = formData.display_name;
      }
      if (formData.bio) {
        updates.bio = formData.bio;
      }
      if (formData.avatar_url) {
        // Remove cache buster from URL before saving
        const cleanAvatarUrl = formData.avatar_url.split('?')[0].split('&')[0];
        updates.avatar_url = cleanAvatarUrl;
      }

      // Clear cache after saving to ensure fresh data
      const { clearCache } = await import('@/lib/cache');
      clearCache('profiles:all');
      
      // Notify other components about profile update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }

      // Only update password if provided
      if (!formData.keepPasswordEmpty && formData.password) {
        if (formData.password !== formData.confirmPassword) {
          alert('הסיסמאות לא תואמות');
          setSaving(false);
          return;
        }
        
        // Validate password length
        if (formData.password.length < 6) {
          alert('הסיסמה חייבת להכיל לפחות 6 תווים');
          setSaving(false);
          return;
        }
        
        // Update password through Supabase Auth
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password
        });
        
        if (passwordError) {
          console.error('Error updating password:', passwordError);
          alert('שגיאה בשינוי הסיסמה: ' + (passwordError.message || 'שגיאה לא ידועה'));
          setSaving(false);
          return;
        }
        
        // Clear password fields after successful update
        setFormData({ ...formData, password: '', confirmPassword: '', keepPasswordEmpty: true });
        alert('הסיסמה שונתה בהצלחה');
      }

      const { error } = await updateProfile(currentUser.user_id || currentUser.id, updates);
      
      if (!error) {
        alert('השינויים נשמרו בהצלחה');
        await loadUser();
      } else {
        alert('שגיאה בשמירת השינויים');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('שגיאה בשמירת השינויים');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">הגדרות חשבון</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
              <button
                onClick={() => setActiveTab('login')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-right ${
                  activeTab === 'login'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">פרטי התחברות</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-right ${
                  activeTab === 'notifications'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Bell className="w-5 h-5" />
                <span className="font-medium">הגדרות התראות</span>
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-right ${
                  activeTab === 'privacy'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-5 h-5" />
                <span className="font-medium">פרטיות</span>
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-right ${
                  activeTab === 'export'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Download className="w-5 h-5" />
                <span className="font-medium">יצוא נתונים</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {activeTab === 'login' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">פרטי התחברות</h2>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      אימייל חשבון
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">לא ניתן לשנות את כתובת האימייל</p>
                  </div>

                  {/* Password Change Section */}
                  <div className="pt-4 border-t border-gray-100">
                    {!formData.keepPasswordEmpty ? (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold text-gray-800">החלפת סיסמה</h3>
                          <button
                            onClick={() => setFormData({ ...formData, keepPasswordEmpty: true, password: '', confirmPassword: '' })}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            ביטול
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            סיסמה חדשה
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] pl-10"
                              placeholder="לפחות 6 תווים"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            אימות סיסמה חדשה
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] pl-10"
                              placeholder="חזור על הסיסמה"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={handleSave}
                            disabled={saving || !formData.password || formData.password !== formData.confirmPassword}
                            className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {saving ? 'שומר...' : 'שמור סיסמה חדשה'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setFormData({ ...formData, keepPasswordEmpty: false })}
                        className="flex items-center gap-2 text-[#F52F8E] font-medium hover:text-pink-700 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        <span>לחץ כאן להחלפת סיסמה</span>
                      </button>
                    )}
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      שם תצוגה
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      תיאור קצר
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] resize-none"
                    />
                  </div>

                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      תמונת פרופיל
                    </label>
                    
                    {/* Avatar Preview with Upload Button */}
                    <div className="flex items-center gap-6 mb-4">
                      <div className="relative">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 flex items-center justify-center text-white font-semibold text-2xl shadow-lg shadow-pink-500/30 ring-2 ring-white/50 cursor-pointer hover:ring-pink-400 transition-all relative group overflow-hidden"
                          title="לחץ להעלאת תמונה"
                        >
                          {uploadingAvatar ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/20">
                              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : avatarPreview ? (
                            <img 
                              src={`${avatarPreview}${avatarPreview.includes('?') ? '&' : '?'}t=${Date.now()}`}
                              alt="Profile" 
                              className="w-full h-full rounded-full object-cover"
                              key={`avatar-${currentUser?.user_id || currentUser?.id}-${Date.now()}`}
                              onError={(e) => {
                                // If image fails to load, try without cache buster
                                const img = e.target as HTMLImageElement;
                                const urlWithoutCache = avatarPreview.split('?')[0].split('&')[0];
                                if (img.src !== urlWithoutCache) {
                                  img.src = urlWithoutCache;
                                }
                              }}
                            />
                          ) : (
                            <span>{currentUser?.display_name?.charAt(0) || currentUser?.first_name?.charAt(0) || 'א'}</span>
                          )}
                          {/* Overlay with Camera Icon */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-full transition-colors flex items-center justify-center">
                            <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        {/* Upload Indicator Badge */}
                        <div className="absolute -bottom-1 -right-1 bg-[#F52F8E] text-white rounded-full p-1.5 shadow-lg">
                          <Upload className="w-4 h-4" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">
                          לחץ על התמונה כדי להעלות תמונת פרופיל חדשה
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2 text-sm font-medium"
                          >
                            <Upload className="w-4 h-4" />
                            העלה תמונה
                          </button>
                          {avatarPreview && (
                            <button
                              onClick={removeAvatar}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                              <X className="w-4 h-4" />
                              הסר
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          פורמטים נתמכים: JPG, PNG, GIF. מקסימום 5MB
                        </p>
                      </div>
                    </div>
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    
                    {/* Avatar URL (Alternative) */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        או הזן קישור לתמונת פרופיל
                      </label>
                      <input
                        type="url"
                        value={formData.avatar_url}
                        onChange={(e) => {
                          setFormData({ ...formData, avatar_url: e.target.value });
                          setAvatarPreview(e.target.value || null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      <span>שמירת שינויים</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">הגדרות התראות</h2>
                  <p className="text-gray-600 mb-6">
                    בחר איזה התראות תרצה לקבל במייל. תוכל לשנות את ההגדרות בכל עת.
                  </p>

                  <div className="space-y-4">
                    {/* Forum Reply Notification */}
                    <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] transition-colors">
                      <input
                        type="checkbox"
                        id="forum_reply"
                        checked={emailPreferences.forum_reply}
                        onChange={(e) => setEmailPreferences({ ...emailPreferences, forum_reply: e.target.checked })}
                        className="mt-1 w-5 h-5 text-[#F52F8E] rounded focus:ring-[#F52F8E] cursor-pointer"
                      />
                      <div className="flex-1">
                        <label htmlFor="forum_reply" className="block text-base font-medium text-gray-800 cursor-pointer">
                          התראה על תגובה על פוסט שפרסמתי
                        </label>
                        <p className="text-sm text-gray-500 mt-1">
                          קבל מייל כאשר מישהו מגיב על פוסט שפרסמת בפורום
                        </p>
                      </div>
                    </div>

                    {/* New Project Notification */}
                    <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] transition-colors">
                      <input
                        type="checkbox"
                        id="new_project"
                        checked={emailPreferences.new_project}
                        onChange={(e) => setEmailPreferences({ ...emailPreferences, new_project: e.target.checked })}
                        className="mt-1 w-5 h-5 text-[#F52F8E] rounded focus:ring-[#F52F8E] cursor-pointer"
                      />
                      <div className="flex-1">
                        <label htmlFor="new_project" className="block text-base font-medium text-gray-800 cursor-pointer">
                          התראה על פרויקט חדש שעלה
                        </label>
                        <p className="text-sm text-gray-500 mt-1">
                          קבל מייל כאשר פרויקט חדש נוצר באתר
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mention Email Preference */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        id="mention"
                        checked={emailPreferences.mention}
                        onChange={(e) => setEmailPreferences({ ...emailPreferences, mention: e.target.checked })}
                        className="mt-1 w-5 h-5 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                      />
                      <div className="flex-1">
                        <label htmlFor="mention" className="block text-base font-medium text-gray-800 cursor-pointer">
                          התראה על תיוג
                        </label>
                        <p className="text-sm text-gray-500 mt-1">
                          קבל מייל כאשר מישהו מתייג אותך בתגובה, פוסט או פורום
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={async () => {
                        setSavingEmailPreferences(true);
                        try {
                          const response = await fetch('/api/email-preferences', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(emailPreferences)
                          });

                          if (response.ok) {
                            alert('ההעדפות נשמרו בהצלחה');
                          } else {
                            const errorData = await response.json();
                            alert(`שגיאה בשמירת ההעדפות: ${errorData.error || 'שגיאה לא ידועה'}`);
                          }
                        } catch (error) {
                          console.error('Error saving email preferences:', error);
                          alert('שגיאה בשמירת ההעדפות');
                        } finally {
                          setSavingEmailPreferences(false);
                        }
                      }}
                      disabled={savingEmailPreferences}
                      className="flex items-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      <span>שמור העדפות</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">פרטיות</h2>
                  <p className="text-gray-600">הגדרות פרטיות יגיעו בקרוב...</p>
                </div>
              )}

              {activeTab === 'export' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">יצוא נתונים</h2>
                  <p className="text-gray-600">אפשרות לייצא את הנתונים שלך תתווסף בקרוב...</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


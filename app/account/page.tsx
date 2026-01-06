'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Bell, Lock, Download, Link as LinkIcon, Save, Upload, X, Camera, Plus, Edit2, Trash2, Instagram, Facebook, Linkedin, Twitter, Youtube, Github, Globe } from 'lucide-react';
import { getAllProfiles, updateProfile } from '@/lib/queries/profiles';
import { supabase } from '@/lib/supabase';
import type { SocialLink } from '@/lib/types';

export default function AccountSettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'login' | 'notifications' | 'social' | 'privacy' | 'export'>('login');
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [editingSocialIndex, setEditingSocialIndex] = useState<number | null>(null);
  const [socialForm, setSocialForm] = useState({ platform: '', url: '' });
  
  const socialPlatforms = [
    { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
    { value: 'twitter', label: 'Twitter/X', icon: Twitter, color: 'bg-black' },
    { value: 'youtube', label: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { value: 'tiktok', label: 'TikTok', icon: LinkIcon, color: 'bg-black' },
    { value: 'github', label: 'GitHub', icon: Github, color: 'bg-gray-800' },
    { value: 'website', label: 'Website', icon: Globe, color: 'bg-gray-600' }
  ];

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    try {
      const { data: profiles } = await getAllProfiles();
      if (profiles && Array.isArray(profiles) && profiles.length > 0) {
        const user = profiles[0];
        setCurrentUser(user);
        setFormData({
          email: user.email || '',
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
        setSocialLinks(user.social_links || []);
      }
    } catch (error) {
      console.error('Error loading user:', error);
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
      loadUser();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // Also poll for profile updates every 30 seconds to catch changes from other users
    const pollInterval = setInterval(() => {
      const { clearCache } = require('@/lib/cache');
      clearCache('profiles:all');
      loadUser();
    }, 30000); // Poll every 30 seconds
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      clearInterval(pollInterval);
    };
  }, []);

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

      // Include social_links in updates if on social tab
      if (activeTab === 'social') {
        updates.social_links = socialLinks;
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
                onClick={() => setActiveTab('social')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-right ${
                  activeTab === 'social'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LinkIcon className="w-5 h-5" />
                <span className="font-medium">Social Accounts</span>
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

                  {/* Password Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="keepPasswordEmpty"
                      checked={formData.keepPasswordEmpty}
                      onChange={(e) => setFormData({ ...formData, keepPasswordEmpty: e.target.checked, password: '', confirmPassword: '' })}
                      className="w-5 h-5 text-[#F52F8E] rounded focus:ring-[#F52F8E]"
                    />
                    <label htmlFor="keepPasswordEmpty" className="text-sm text-gray-700">
                      השאר את שדות הסיסמה ריקים אם אינך רוצה לשנות
                    </label>
                  </div>

                  {/* New Password */}
                  {!formData.keepPasswordEmpty && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          הזן סיסמה חדשה
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          חזור על הסיסמה החדשה
                        </label>
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                        />
                      </div>
                    </>
                  )}

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
                  <p className="text-gray-600">הגדרות התראות יגיעו בקרוב...</p>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Social Accounts</h2>
                    <button
                      onClick={() => {
                        setEditingSocialIndex(null);
                        setSocialForm({ platform: '', url: '' });
                        setShowSocialModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>הוסף רשת חברתית</span>
                    </button>
                  </div>

                  {socialLinks.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">עדיין לא הוספת רשתות חברתיות</p>
                      <button
                        onClick={() => {
                          setEditingSocialIndex(null);
                          setSocialForm({ platform: '', url: '' });
                          setShowSocialModal(true);
                        }}
                        className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors"
                      >
                        הוסף רשת חברתית ראשונה
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {socialLinks.map((link, index) => {
                        const platform = socialPlatforms.find(p => p.value === link.platform);
                        const Icon = platform?.icon || LinkIcon;
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg ${platform?.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{platform?.label || link.platform}</p>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-gray-500 hover:text-[#F52F8E] transition-colors truncate max-w-xs block"
                                >
                                  {link.url}
                                </a>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingSocialIndex(index);
                                  setSocialForm({ platform: link.platform, url: link.url });
                                  setShowSocialModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-[#F52F8E] hover:bg-pink-50 rounded-lg transition-colors"
                                title="ערוך"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const updated = socialLinks.filter((_, i) => i !== index);
                                  setSocialLinks(updated);
                                }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="מחק"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {socialLinks.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            if (!currentUser) return;
                            const { error } = await updateProfile(currentUser.user_id || currentUser.id, {
                              social_links: socialLinks
                            });
                            if (!error) {
                              alert('הרשתות החברתיות נשמרו בהצלחה');
                              await loadUser();
                            } else {
                              alert('שגיאה בשמירת הרשתות החברתיות');
                            }
                          } catch (error) {
                            console.error('Error saving social links:', error);
                            alert('שגיאה בשמירת הרשתות החברתיות');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-5 h-5" />
                        <span>שמור שינויים</span>
                      </button>
                    </div>
                  )}

                  {/* Social Link Modal */}
                  {showSocialModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-800">
                            {editingSocialIndex !== null ? 'ערוך רשת חברתית' : 'הוסף רשת חברתית'}
                          </h3>
                          <button
                            onClick={() => {
                              setShowSocialModal(false);
                              setEditingSocialIndex(null);
                              setSocialForm({ platform: '', url: '' });
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              פלטפורמה
                            </label>
                            <select
                              value={socialForm.platform}
                              onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                            >
                              <option value="">בחר פלטפורמה</option>
                              {socialPlatforms.map((platform) => (
                                <option key={platform.value} value={platform.value}>
                                  {platform.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              קישור (URL)
                            </label>
                            <input
                              type="url"
                              value={socialForm.url}
                              onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                              placeholder="https://..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => {
                              if (!socialForm.platform || !socialForm.url) {
                                alert('אנא מלא את כל השדות');
                                return;
                              }

                              if (editingSocialIndex !== null) {
                                const updated = [...socialLinks];
                                updated[editingSocialIndex] = { platform: socialForm.platform, url: socialForm.url };
                                setSocialLinks(updated);
                              } else {
                                setSocialLinks([...socialLinks, { platform: socialForm.platform, url: socialForm.url }]);
                              }

                              setShowSocialModal(false);
                              setEditingSocialIndex(null);
                              setSocialForm({ platform: '', url: '' });
                            }}
                            className="flex-1 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors"
                          >
                            שמור
                          </button>
                          <button
                            onClick={() => {
                              setShowSocialModal(false);
                              setEditingSocialIndex(null);
                              setSocialForm({ platform: '', url: '' });
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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


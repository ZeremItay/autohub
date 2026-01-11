'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircleMore, Send, CheckCircle, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAllProfiles } from '@/lib/queries/profiles';

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    rating: '',
    feedback_type: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user info if logged in
  useEffect(() => {
    async function loadUserInfo() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          setIsLoggedIn(true);
          // Get user profile
          const profiles = await getAllProfiles();
          const profilesArray = Array.isArray(profiles) ? profiles : [];
          const userProfile = profilesArray.find((p: any) => 
            (p.user_id || p.id) === authUser.id
          );

          if (userProfile) {
            const displayName = userProfile.display_name || 
                               userProfile.first_name || 
                               userProfile.nickname || 
                               '';
            const userEmail = authUser.email || userProfile.email || '';

            setFormData(prev => ({
              ...prev,
              name: displayName,
              email: userEmail
            }));
          }
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUserInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `feedback/${fileName}`;

        // Try to upload to feedback-images bucket first
        let uploadError = null;
        let bucketName = 'feedback-images';
        
        const { error: uploadError1 } = await supabase.storage
          .from('feedback-images')
          .upload(filePath, imageFile);

        if (uploadError1) {
          // Fallback to avatars bucket if feedback-images doesn't exist
          const { error: uploadError2 } = await supabase.storage
            .from('avatars')
            .upload(filePath, imageFile);

          if (uploadError2) {
            console.error('Upload error:', uploadError2);
            throw new Error(`שגיאה בהעלאת התמונה: ${uploadError2.message || 'שגיאה לא ידועה'}`);
          } else {
            bucketName = 'avatars';
          }
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // If user is logged in, ensure name and email are sent (even if empty, API will fill from profile)
      const submitData = {
        ...formData,
        image_url: imageUrl
      };

      // If logged in but name/email are empty, send empty strings (API will fill from profile)
      if (isLoggedIn) {
        if (!submitData.name) submitData.name = '';
        if (!submitData.email) submitData.email = '';
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Feedback API Error:', result);
        throw new Error(result.error || 'שגיאה בשליחת הפידבק');
      }

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        rating: '',
        feedback_type: ''
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      const errorMessage = err.message || 'שגיאה בשליחת הפידבק. נסה שוב.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen relative">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="glass rounded-3xl p-6 sm:p-8 text-center shadow-xl">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-4 text-gray-800">תודה על הפידבק!</h1>
              <p className="text-lg mb-6 text-gray-600">
                הפידבק שלך נשלח בהצלחה. אנו מעריכים את הזמן שלקחת לשתף אותנו בדעתך.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="bg-[#F52F8E] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors"
              >
                שלח פידבק נוסף
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="glass rounded-3xl p-6 sm:p-8 mb-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircleMore className="w-8 h-8 text-[#F52F8E]" />
              <h1 className="text-3xl font-bold text-gray-800">פידבקים</h1>
            </div>
            <p className="text-lg leading-relaxed text-gray-600">
              אנחנו רוצים לשמוע ממך! שתף אותנו בדעתך, רעיונות לשיפור, או כל דבר אחר שתרצה לומר.
              הפידבק שלך עוזר לנו לשפר את הקהילה ואת החוויה שלך.
            </p>
          </div>

          {/* Feedback Form */}
          <div className="glass rounded-3xl p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {/* Name - only show if not logged in */}
              {!isLoggedIn && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-700">
                    שם *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent"
                    placeholder="השם שלך"
                  />
                </div>
              )}

              {/* Email - only show if not logged in */}
              {!isLoggedIn && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700">
                    אימייל (אופציונלי)
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              )}

              {/* Feedback Type */}
              <div>
                <label htmlFor="feedback_type" className="block text-sm font-medium mb-2 text-gray-700">
                  סוג פידבק *
                </label>
                <select
                  id="feedback_type"
                  name="feedback_type"
                  value={formData.feedback_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 bg-white border border-gray-300 text-gray-800 focus:ring-[#F52F8E] focus:border-transparent [&>option]:bg-white [&>option]:text-gray-800"
                >
                  <option value="">בחר סוג פידבק</option>
                  <option value="הצעה לשיפור">הצעה לשיפור</option>
                  <option value="דיווח על באג">דיווח על באג</option>
                  <option value="בקשה לתוכן חדש">בקשה לתוכן חדש</option>
                  <option value="פרגון">פרגון</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2 text-gray-700">
                  נושא *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent"
                  placeholder="מה הנושא של הפידבק שלך?"
                />
              </div>

              {/* Rating */}
              <div>
                <label htmlFor="rating" className="block text-sm font-medium mb-2 text-gray-700">
                  דירוג (1-5) *
                </label>
                <select
                  id="rating"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 bg-white border border-gray-300 text-gray-800 focus:ring-[#F52F8E] focus:border-transparent [&>option]:bg-white [&>option]:text-gray-800"
                >
                  <option value="">בחר דירוג</option>
                  <option value="5">5 - מעולה</option>
                  <option value="4">4 - טוב מאוד</option>
                  <option value="3">3 - טוב</option>
                  <option value="2">2 - צריך שיפור</option>
                  <option value="1">1 - לא טוב</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2 text-gray-700">
                  הודעה *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent resize-none"
                  placeholder="שתף אותנו בפידבק שלך..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label htmlFor="image" className="block text-sm font-medium mb-2 text-gray-700">
                  תמונה (אופציונלי)
                </label>
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F52F8E] transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-[#F52F8E]"
                  >
                    <Upload className="w-5 h-5" />
                    <span>העלה תמונה</span>
                  </button>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#F52F8E] text-white py-3 rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>שולח...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>שלח פידבק</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


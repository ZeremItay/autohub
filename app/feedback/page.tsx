'use client';

import { useState, useRef } from 'react';
import { MessageCircleMore, Send, CheckCircle, Upload, X } from 'lucide-react';
import GlassCard from '@/app/components/GlassCard';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getCardStyles,
  getTextStyles,
  getInputStyles,
  combineStyles
} from '@/lib/utils/themeStyles';

export default function FeedbackPage() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    rating: 5,
    feedback_type: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    setUploadingImage(true);
    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `feedback-${Date.now()}.${fileExt}`;
      const filePath = `feedbacks/${fileName}`;

      // Try to upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('feedbacks')
        .upload(filePath, selectedImage, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        // If bucket doesn't exist, try 'avatars' bucket as fallback
        const fallbackPath = `feedbacks/${fileName}`;
        const { error: uploadError2 } = await supabase.storage
          .from('avatars')
          .upload(fallbackPath, selectedImage, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError2) {
          console.warn('Error uploading image, continuing without image:', uploadError2);
          return null;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fallbackPath);
          return publicUrl;
        }
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('feedbacks')
          .getPublicUrl(filePath);
        return publicUrl;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Upload image first if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage();
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl
        }),
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
        rating: 5,
        feedback_type: ''
      });
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen relative">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <GlassCard rounded="3xl" padding="lg" className="text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h1 className={`text-3xl font-bold mb-4 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>תודה על הפידבק!</h1>
              <p className={`text-lg mb-6 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
              }`}>
                הפידבק שלך נשלח בהצלחה. אנו מעריכים את הזמן שלקחת לשתף אותנו בדעתך.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-primary px-6 py-3"
              >
                שלח פידבק נוסף
              </button>
            </GlassCard>
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
          <GlassCard rounded="3xl" padding="lg" className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircleMore className={`w-8 h-8 ${
                theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
              }`} />
              <h1 className={`text-3xl font-bold ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>פידבקים</h1>
            </div>
            <p className={`text-lg leading-relaxed ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>
              אנחנו רוצים לשמוע ממך! שתף אותנו בדעתך, רעיונות לשיפור, או כל דבר אחר שתרצה לומר.
              הפידבק שלך עוזר לנו לשפר את הקהילה ואת החוויה שלך.
            </p>
          </GlassCard>

          {/* Feedback Form */}
          <GlassCard rounded="3xl" padding="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className={`block text-sm font-medium mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}>
                  שם (אופציונלי)
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent'
                      : 'bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-hot-pink focus:border-transparent'
                  }`}
                  placeholder="השם שלך"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}>
                  אימייל (אופציונלי)
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent'
                      : 'bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-hot-pink focus:border-transparent'
                  }`}
                  placeholder="your@email.com"
                />
              </div>

              {/* Feedback Type */}
              <div>
                <label htmlFor="feedback_type" className={`block text-sm font-medium mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}>
                  סוג פידבק *
                </label>
                <select
                  id="feedback_type"
                  name="feedback_type"
                  value={formData.feedback_type}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-800 focus:ring-[#F52F8E] focus:border-transparent [&>option]:bg-white [&>option]:text-gray-800'
                      : 'bg-white/5 border border-white/20 text-white focus:ring-hot-pink focus:border-transparent [&>option]:bg-[#1e293b] [&>option]:text-white'
                  }`}
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
                <label htmlFor="subject" className={`block text-sm font-medium mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}>
                  נושא *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent'
                      : 'bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-hot-pink focus:border-transparent'
                  }`}
                  placeholder="מה הנושא של הפידבק שלך?"
                />
              </div>

              {/* Rating */}
              <div>
                <label htmlFor="rating" className={`block text-sm font-medium mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}>
                  דירוג (1-5) *
                </label>
                <select
                  id="rating"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-800 focus:ring-[#F52F8E] focus:border-transparent [&>option]:bg-white [&>option]:text-gray-800'
                      : 'bg-white/5 border border-white/20 text-white focus:ring-hot-pink focus:border-transparent [&>option]:bg-[#1e293b] [&>option]:text-white'
                  }`}
                >
                  <option value={5}>5 - מעולה</option>
                  <option value={4}>4 - טוב מאוד</option>
                  <option value={3}>3 - טוב</option>
                  <option value={2}>2 - צריך שיפור</option>
                  <option value={1}>1 - לא טוב</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className={`block text-sm font-medium mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}>
                  הודעה *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 resize-none ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-[#F52F8E] focus:border-transparent'
                      : 'bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-hot-pink focus:border-transparent'
                  }`}
                  placeholder="שתף אותנו בדעתך, רעיונות לשיפור, או כל דבר אחר שתרצה לומר..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label htmlFor="image" className={`block text-sm font-medium mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}>
                  תמונה/צילום מסך (אופציונלי)
                </label>
                {!imagePreview ? (
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    theme === 'light'
                      ? 'border-gray-300 hover:border-[#F52F8E]'
                      : 'border-white/20 hover:border-hot-pink/50'
                  }`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="image"
                      name="image"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="image"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <Upload className={`w-8 h-8 ${
                        theme === 'light' ? 'text-gray-400' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className={`text-sm mb-1 ${
                          theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                        }`}>לחץ לבחירת תמונה</p>
                        <p className={`text-xs ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}>PNG, JPG, GIF עד 5MB</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <div className={`relative w-full h-64 rounded-lg overflow-hidden border ${
                      theme === 'light'
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-white/20 bg-white/5'
                    }`}>
                      {imagePreview && (
                        <>
                          <img
                            src={imagePreview}
                            alt="תצוגה מקדימה"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors z-10"
                            title="הסר תמונה"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <p className={`text-xs mt-2 ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {selectedImage?.name} ({(selectedImage?.size || 0) / 1024 / 1024 < 1 
                        ? `${Math.round((selectedImage?.size || 0) / 1024)}KB`
                        : `${Math.round((selectedImage?.size || 0) / 1024 / 1024 * 10) / 10}MB`})
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>מעלה תמונה...</span>
                  </>
                ) : submitting ? (
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
          </GlassCard>
        </div>
      </div>
    </div>
  );
}


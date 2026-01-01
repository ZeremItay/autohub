'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRecordingById, incrementRecordingViews } from '@/lib/queries/recordings';
import { getRecordingComments, createComment, deleteComment, type Comment } from '@/lib/queries/comments';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { isPremiumUser } from '@/lib/utils/user';
import { formatDate } from '@/lib/utils/date';
import { CommentsList } from '@/app/components/comments';
import AuthGuard from '@/app/components/AuthGuard';
import { ArrowRight, Share2, Eye, Clock, Calendar, Tag, Send, Trash2, MessageCircle, HelpCircle, Star, Play, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export default function RecordingDetailPage() {
  return (
    <AuthGuard requirePremium={true} fallbackMessage="צריך לשדרג לפרימיום כדי לצפות בתוכן זה">
      <RecordingDetailPageContent />
    </AuthGuard>
  );
}

function RecordingDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isPremium: userIsPremium, refetch: refetchUser } = useCurrentUser();
  const [recording, setRecording] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [openQaIndex, setOpenQaIndex] = useState<number | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Helper function to ensure video URLs are always HTTPS
  function ensureHttpsUrl(url: string): string {
    if (!url) return url;
    // Replace http:// with https://
    let httpsUrl = url.replace(/^http:\/\//, 'https://');
    // Log the transformation for debugging
    if (httpsUrl !== url) {
      console.log('URL converted from HTTP to HTTPS:', { original: url, converted: httpsUrl });
    }
    return httpsUrl;
  }

  useEffect(() => {
    if (params.id) {
      // Load full recording data immediately (includes qa_section and key_points)
      loadRecordingFull(params.id as string);
      // Load comments in parallel
      loadComments(params.id as string).catch(() => {});
    }
  }, [params.id]);

  // Reload comments when page becomes visible (to update avatars)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && params.id) {
        loadComments(params.id as string);
        refetchUser();
      }
    };

    // Listen for profile updates
    const handleProfileUpdate = () => {
      if (params.id) {
        loadComments(params.id as string);
        refetchUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [params.id]);

  function handlePlayClick() {
    if (!userIsPremium) {
      alert('גישה להקלטות זמינה למנויי פרימיום בלבד. אנא שדרג את המנוי שלך כדי לצפות בהקלטות.');
      return;
    }
    // If premium, allow normal navigation (already handled by onClick on the card)
  }

  // Load full recording details (includes qa_section and key_points)
  async function loadRecordingFull(id: string) {
    setLoading(true);
    setDetailsLoading(true);
    try {
      const { data, error } = await getRecordingById(id);
      if (!error && data) {
        setRecording(data);
        // Increment views in background (non-blocking)
        incrementRecordingViews(id).catch(() => {});
      } else if (error) {
        console.error('Error loading recording:', error);
      }
    } catch (error) {
      console.error('Error loading recording full:', error);
    } finally {
      setLoading(false);
      setDetailsLoading(false);
    }
  }

  async function loadComments(recordingId: string) {
    try {
      const { data, error } = await getRecordingComments(recordingId);
      if (!error && data) {
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function handleSubmitComment(text?: string) {
    const commentTextToUse = text || commentText;
    if (!commentTextToUse.trim() || !currentUser || !recording) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        return;
      }
      
      const { data, error } = await createComment(
        recording.id,
        userId,
        commentTextToUse
      );
      
      if (!error && data) {
        if (!text) {
          setCommentText('');
        }
        // Reload comments to get updated profiles
        await loadComments(recording.id);
        // Also reload current user to get updated avatar
        await refetchUser();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  }

  async function handleSubmitReply(parentId: string, text?: string) {
    const replyTextToUse = text || replyText;
    if (!replyTextToUse.trim() || !currentUser || !recording) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        return;
      }
      
      const { data, error } = await createComment(
        recording.id,
        userId,
        replyTextToUse,
        parentId
      );
      
      if (!error && data) {
        console.log('Reply created successfully:', {
          replyId: data.id,
          userId: userId,
          user: data.user,
          displayName: data.user?.display_name || data.user?.first_name || data.user?.nickname || 'משתמש'
        });
        
        if (!text) {
          setReplyText('');
          setReplyingTo(null);
        }
        // Reload comments to get updated profiles
        await loadComments(recording.id);
        // Also reload current user to get updated avatar
        await refetchUser();
      } else {
        console.error('Error creating reply:', error);
        alert(`שגיאה ביצירת התגובה: ${error?.message || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) return;
    
    try {
      const { error } = await deleteComment(commentId);
      if (!error && recording) {
        await loadComments(recording.id);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="text-[#F52F8E] text-xl">טוען הקלטה...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">הקלטה לא נמצאה</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/recordings')}
            className="flex items-center gap-2 text-gray-600 hover:text-[#F52F8E] transition-colors mb-6"
          >
            <ArrowRight className="w-4 h-4" />
            <span>חזרה להקלטות</span>
          </button>

        {/* Video Player */}
        <div className="bg-black rounded-[20px] overflow-hidden mb-6 aspect-video relative border-2 border-hot-pink/40 shadow-[0_0_20px_rgba(236,72,153,0.3),0_8px_32px_rgba(0,0,0,0.5)]">
          {!userIsPremium ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-hot-pink rounded-full flex items-center justify-center mx-auto mb-6">
                  <Play className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">גישה מוגבלת</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  צפייה בהקלטות זמינה למנויי פרימיום בלבד. שדרג את המנוי שלך כדי לקבל גישה לכל ההקלטות, קורסים מתקדמים ותכונות נוספות.
                </p>
                <button
                  onClick={() => window.location.href = '/subscription'}
                  className="btn-primary px-6 py-3 font-semibold text-lg"
                >
                  שדרג למנוי פרימיום
                </button>
              </div>
            </div>
          ) : recording.video_url ? (
            (() => {
              // Check if it's a YouTube URL
              const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
              const youtubeMatch = recording.video_url.match(youtubeRegex);
              
              // Check if it's a Vimeo URL
              const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
              const vimeoMatch = recording.video_url.match(vimeoRegex);
              
              if (youtubeMatch) {
                // YouTube embed
                const videoId = youtubeMatch[1];
                return (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={recording.title}
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
                    title={recording.title}
                  />
                );
              } else {
                // Direct video URL - ensure HTTPS to prevent Mixed Content errors
                const videoUrl = ensureHttpsUrl(recording.video_url);
                return (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    preload="metadata"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error('Video loading error:', {
                        error: e,
                        videoUrl: videoUrl,
                        originalUrl: recording.video_url
                      });
                      const videoElement = e.currentTarget;
                      if (videoElement.error) {
                        console.error('Video error details:', {
                          code: videoElement.error.code,
                          message: videoElement.error.message
                        });
                      }
                    }}
                    onLoadStart={() => {
                      console.log('Video load started:', videoUrl);
                    }}
                    onCanPlay={() => {
                      console.log('Video can play:', videoUrl);
                    }}
                  >
                    הדפדפן שלך לא תומך בנגן וידאו.
                  </video>
                );
              }
            })()
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center">
                <p className="text-lg mb-2">אין קישור וידאו זמין</p>
                <p className="text-sm text-gray-400">אנא הוסף קישור וידאו להקלטה</p>
              </div>
            </div>
          )}
        </div>

        {/* Recording Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          {/* Tags */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {recording.is_new && (
              <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded">
                חדש
              </span>
            )}
            {recording.category && (
              <div className="flex flex-wrap gap-2">
                {Array.isArray(recording.category) ? (
                  recording.category.map((cat: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-[#F52F8E] text-white text-sm font-semibold rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {cat}
                    </span>
                  ))
                ) : (
                  <span className="px-3 py-1 bg-[#F52F8E] text-white text-sm font-semibold rounded flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {recording.category}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">{recording.title}</h1>

          {/* Metadata */}
          <div className="flex items-center gap-4 mb-6 flex-wrap text-sm text-gray-500">
            {recording.views !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{recording.views} צפיות</span>
              </div>
            )}
            {recording.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{recording.duration}</span>
              </div>
            )}
            {recording.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(recording.created_at)}</span>
              </div>
            )}
          </div>

          {/* Share Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-[#F52F8E] rounded-lg transition-colors mb-6">
            <Share2 className="w-4 h-4" />
            <span>שיתוף</span>
          </button>

          {/* Loading indicator for additional details */}
          {detailsLoading && (
            <div className="mb-6 text-center py-4">
              <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-[#F52F8E] border-t-transparent rounded-full animate-spin"></div>
                <span>טוען פרטים נוספים...</span>
              </div>
            </div>
          )}

          {/* Description */}
          {recording.description && (() => {
            const words = recording.description.split(/\s+/);
            const shouldTruncate = words.length > 25;
            const truncatedText = shouldTruncate ? words.slice(0, 25).join(' ') : recording.description;
            
            return (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-3">תיאור</h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {shouldTruncate && !descriptionExpanded ? (
                    <>
                      {truncatedText}...
                      <button
                        onClick={() => setDescriptionExpanded(true)}
                        className="text-[#F52F8E] hover:text-[#E01E7A] font-medium ml-2 transition-colors"
                      >
                        המשך קריאה
                      </button>
                    </>
                  ) : (
                    <>
                      {recording.description}
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

          {/* Key Points Section */}
          {recording.key_points && recording.key_points.length > 0 && (
            <div className="mb-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-800">נקודות חשובות</h2>
              </div>
              <div className="space-y-4">
                {recording.key_points.map((point: any, index: number) => (
                  <div key={index} className="bg-gray-50 border-r-4 border-amber-400 p-4 rounded-lg">
                    {point.url ? (
                      <a
                        href={point.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <h3 className="font-semibold text-gray-800 mb-2 hover:text-[#F52F8E] transition-colors inline-flex items-center gap-2">
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
          {recording.qa_section && recording.qa_section.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-6 h-6 text-cyan-500" />
                <h2 className="text-xl font-bold text-gray-800">שאלות ותשובות</h2>
              </div>
              <div className="space-y-2">
                {recording.qa_section.map((qa: any, index: number) => {
                  const isOpen = openQaIndex === index;
                  return (
                    <div key={index} className="border border-cyan-200 rounded-lg overflow-hidden bg-cyan-50/50">
                      <button
                        onClick={() => setOpenQaIndex(isOpen ? null : index)}
                        className="w-full hover:bg-cyan-100/50 p-4 flex items-center justify-between text-right transition-colors"
                      >
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-cyan-600 font-semibold">ש:</span>
                          <span className="font-semibold text-gray-800">{qa.question}</span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-cyan-600 flex-shrink-0 mr-2" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-cyan-600 flex-shrink-0 mr-2" />
                        )}
                      </button>
                      {isOpen && qa.answer && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            <span className="text-cyan-600 font-medium">ת: </span>
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
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle className="w-6 h-6 text-[#F52F8E]" />
            <h2 className="text-2xl font-bold text-gray-800">תגובות ({comments.length})</h2>
          </div>

          <CommentsList
            comments={comments as any}
            currentUser={currentUser as any}
            onSubmitComment={async (text) => {
              await handleSubmitComment(text);
            }}
            onSubmitReply={async (commentId, text) => {
              await handleSubmitReply(commentId, text);
            }}
            onDeleteComment={handleDeleteComment}
            emptyMessage="אין תגובות עדיין. היה הראשון להגיב!"
            showForm={true}
          />
        </div>
      </div>
    </div>
  );
}

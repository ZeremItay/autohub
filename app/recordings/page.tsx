'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getRecordingsPaginated } from '@/lib/queries/recordings';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { hasRecordingAccess } from '@/lib/utils/user';
import { formatDate } from '@/lib/utils/date';
import { getTagsByContentBatch, type Tag } from '@/lib/queries/tags';
import { stripHtml } from '@/lib/utils/stripHtml';
import {
  Play,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function RecordingsPage() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const userHasRecordingAccess = hasRecordingAccess(currentUser);
  const [recordings, setRecordings] = useState<any[]>([])
  const [recordingTags, setRecordingTags] = useState<Record<string, Tag[]>>({})
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('recently-active')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 12 // Increased from 6 to 12 for faster browsing (4x3 grid)

  // Ref to prevent parallel calls to loadRecordings
  const isLoadingRecordingsRef = useRef(false);

  const loadRecordings = useCallback(async () => {
    // Prevent parallel calls
    if (isLoadingRecordingsRef.current) {
      return;
    }

    isLoadingRecordingsRef.current = true;
    
    // Clear previous recordings when loading new page to avoid showing stale data
    if (currentPage !== 1) {
      setPaginationLoading(true)
      // Clear recordings immediately when changing pages to avoid showing stale data
      setRecordings([])
      setRecordingTags({})
    } else {
      setLoading(true)
      // Clear recordings on initial load too
      setRecordings([])
      setRecordingTags({})
    }
    setError(null)
    
    try {
      const { data, totalCount: total, error: fetchError } = await getRecordingsPaginated(currentPage, itemsPerPage, sortBy)

      if (fetchError) {
        setError('שגיאה בטעינת ההקלטות. אנא נסה שוב.')
        console.error('Error loading recordings:', fetchError)
        setLoading(false);
        setPaginationLoading(false);
        isLoadingRecordingsRef.current = false;
        return
      }
      
      if (data) {
        // Data is already sorted by the query
        let processed = Array.isArray(data) ? [...data] : []

        // Mark new recordings (within last 30 days)
        if (processed.length > 0 && sortBy === 'recently-active') {
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
          processed = processed.map(recording => {
            const date = new Date(recording.created_at || recording.updated_at || 0).getTime()
            if (date > thirtyDaysAgo) {
              return { ...recording, is_new: true }
            }
            return recording
          })
        }

        setRecordings(processed)
        setTotalCount(total || 0)

        // Load tags in parallel for current page recordings
        if (processed.length > 0) {
          const recordingIds = processed.map((r: any) => r.id)
          const { data: tagsData } = await getTagsByContentBatch('recording', recordingIds)

          // Group tags by recording ID
          const tagsMap: Record<string, Tag[]> = {}
          if (Array.isArray(tagsData)) {
            tagsData.forEach((assignment: any) => {
              if (assignment.tag && assignment.content_id) {
                if (!tagsMap[assignment.content_id]) {
                  tagsMap[assignment.content_id] = []
                }
                tagsMap[assignment.content_id].push(assignment.tag)
              }
            })
          }
          setRecordingTags(tagsMap)
        } else {
          setRecordingTags({})
        }
      } else {
        setError('לא נמצאו הקלטות')
        setRecordings([])
        setRecordingTags({})
      }
    } catch (err: any) {
      setError('שגיאה בטעינת ההקלטות. אנא נסה שוב.')
      console.error('Error loading recordings:', err)
    } finally {
      setLoading(false);
      setPaginationLoading(false);
      isLoadingRecordingsRef.current = false;
    }
  }, [currentPage, sortBy, itemsPerPage])

  useEffect(() => {
    // Load recordings when page or sort changes
    let cancelled = false;
    
    loadRecordings().catch(error => {
      if (!cancelled) {
        console.error('Error in loadRecordings effect:', error);
      }
    });
    
    return () => {
      cancelled = true;
      // Don't mark as cancelled here - only timeout should do that
      // This prevents race conditions when dependencies change
    };
  }, [loadRecordings])

  function handleRecordingClick(recordingId: string) {
    if (!userHasRecordingAccess) {
      // Don't navigate, just return - the ProtectedAction logic will handle the modal/tooltip if we wrap the card
      // OR if we want to show a custom alert here:
      if (confirm('גישה להקלטות זמינה למנויי פרימיום בלבד. האם ברצונך לשדרג את המנוי?')) {
        router.push('/pricing');
      }
      return;
    }
    router.push(`/recordings/${recordingId}`);
  }

  // Pagination calculations - use totalCount from server for total pages
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Reset to page 1 when sort changes (only if not already on page 1)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [sortBy])


  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto overflow-x-hidden">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Play className="w-8 h-8 text-[#F52F8E]" />
            <h1 className="text-4xl font-bold text-gray-800">הקלטות</h1>
          </div>
          <p className="text-gray-600 text-lg">
            צפו בהקלטות מלייבים, וובינרים ומפגשי קהילה
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => loadRecordings()}
              className="mr-auto text-red-600 hover:text-red-800 text-sm font-medium underline"
            >
              נסה שוב
            </button>
          </div>
        )}

        {/* Recordings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading && !paginationLoading && recordings.length > 0 && recordings.map((recording) => (
            <div
              key={recording.id}
              onClick={() => handleRecordingClick(recording.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative flex flex-col h-full"
            >
              {/* Show lock overlay only when user loading is complete, user is logged in, and user is not premium */}
              {!userLoading && currentUser && !userHasRecordingAccess ? (
                <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center rounded-xl p-4 text-center">
                  <Lock className="w-8 h-8 text-white mb-2" />
                  <p className="text-white font-bold mb-1">מנוי פרימיום נדרש</p>
                  <p className="text-gray-300 text-xs mb-3">שדרג את המנוי כדי לצפות בהקלטה זו</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/pricing');
                    }}
                    className="bg-[#F52F8E] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#E01E7A] transition-colors"
                  >
                    שדרג לפרימיום
                  </button>
                </div>
              ) : userLoading ? (
                <div className="absolute inset-0 bg-black/20 z-10 flex items-center justify-center rounded-xl">
                  <div className="text-center text-white p-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                </div>
              ) : null}
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                {recording.thumbnail_url ? (
                  // Show thumbnail image with lazy loading
                  <img
                    src={recording.thumbnail_url}
                    alt={recording.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      // Fallback to gradient if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500';
                        fallback.innerHTML = `<svg class="w-16 h-16 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  // Placeholder gradient with play button
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
                    <Play className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                
                {/* Play button overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                {/* New Badge */}
                {recording.is_new && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded shadow-lg z-10">
                    חדש
                  </div>
                )}

                {/* Duration Overlay */}
                {recording.duration && (
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1 z-10">
                    <Clock className="w-3 h-3" />
                    {recording.duration}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-grow">
                {/* Tags */}
                {recordingTags[recording.id] && recordingTags[recording.id].length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {recordingTags[recording.id].map((tag: Tag) => (
                      <span key={tag.id} className="text-xs font-semibold text-[#F52F8E] uppercase px-2 py-1 bg-pink-50 rounded">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-[#F52F8E] transition-colors flex-shrink-0">
                  {recording.title}
                </h3>

                {/* Instructor */}
                {recording.instructor_name && (
                  <div className="flex items-center gap-2 mb-2">
                    {recording.instructor_avatar_url ? (
                      <img
                        src={recording.instructor_avatar_url}
                        alt={recording.instructor_name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                        {recording.instructor_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-700">{recording.instructor_name}</span>
                      {recording.instructor_title && (
                        <span className="text-xs text-gray-500">{recording.instructor_title}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {recording.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {stripHtml(recording.description)}
                  </p>
                )}

                {/* Metadata - Always at the bottom */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                  {recording.views !== undefined && (
                    <span>{recording.views} צפיות</span>
                  )}
                  {recording.created_at && (
                    <span>{formatDate(recording.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {recordings.length === 0 && !loading && !paginationLoading && (
          <div className="text-center py-12">
            <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">לא נמצאו הקלטות</p>
          </div>
        )}

        {/* Loading State - Show skeleton while loading */}
        {loading && recordings.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200"></div>
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="flex justify-between mt-4">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center justify-center gap-4 w-full">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || paginationLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1 || paginationLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                }`}
              >
                {paginationLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                קודם
              </button>
              
              <div className="flex items-center justify-center gap-2 flex-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        disabled={paginationLoading}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors flex items-center justify-center ${
                          currentPage === page
                            ? 'bg-[#F52F8E] text-white'
                            : paginationLoading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="text-gray-400 px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || paginationLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages || paginationLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                }`}
              >
                הבא
                {paginationLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Page Info */}
        {recordings.length > 0 && !loading && !paginationLoading && (
          <div className="mt-4 text-center text-sm text-gray-600">
            מציג {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} מתוך {totalCount} הקלטות
          </div>
        )}
      </div>
    </div>
  )
}

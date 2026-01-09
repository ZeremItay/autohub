'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getRecordingsPaginated } from '@/lib/queries/recordings';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { isPremiumUser } from '@/lib/utils/user';
import { formatDate } from '@/lib/utils/date';
import { getTagsByContent, getTagsByContentBatch, type Tag } from '@/lib/queries/tags';
import { 
  Search, 
  Grid3x3, 
  List, 
  MoreVertical,
  Trophy,
  Star,
  Mail,
  ChevronDown,
  Play,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function RecordingsPage() {
  const router = useRouter();
  const { user: currentUser, isPremium: userIsPremium, loading: userLoading } = useCurrentUser();
  const [recordings, setRecordings] = useState<any[]>([])
  const [recordingTags, setRecordingTags] = useState<Record<string, Tag[]>>({})
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recently-active')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeFilter, setActiveFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 6

  // Ref to prevent parallel calls to loadRecordings
  const isLoadingRecordingsRef = useRef(false);
  // Ref to track if the operation was cancelled (timeout or unmount)
  const isCancelledRef = useRef(false);

  const loadRecordings = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:48',message:'loadRecordings START',data:{currentPage,sortBy,isLoading:isLoadingRecordingsRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Prevent parallel calls
    if (isLoadingRecordingsRef.current) {
      console.log('loadRecordings already running, skipping...');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:51',message:'loadRecordings SKIPPED - already running',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    isLoadingRecordingsRef.current = true;
    isCancelledRef.current = false; // Reset cancellation flag
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:56',message:'loadRecordings INIT',data:{isCancelled:isCancelledRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Add timeout to prevent hanging (Chrome-specific issue)
    const timeoutStartTime = Date.now();
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      const timeoutDuration = Date.now() - timeoutStartTime;
      console.warn('loadRecordings taking too long, stopping loading state');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:60',message:'TIMEOUT TRIGGERED',data:{timeoutDuration,isCancelled:isCancelledRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      isCancelledRef.current = true; // Mark as cancelled
      setLoading(false);
      setPaginationLoading(false);
      isLoadingRecordingsRef.current = false; // CRITICAL: Reset ref on timeout
    }, 30000); // 30 seconds timeout - increased for slow DB queries
    
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
      const queryStartTime = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:82',message:'BEFORE getRecordingsPaginated',data:{currentPage,itemsPerPage,sortBy,isCancelled:isCancelledRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const { data, totalCount: total, error: fetchError } = await getRecordingsPaginated(currentPage, itemsPerPage, sortBy)
      
      const queryDuration = Date.now() - queryStartTime;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:85',message:'AFTER getRecordingsPaginated',data:{queryDuration,hasData:!!data,dataLength:data?.length||0,totalCount:total,hasError:!!fetchError,isCancelled:isCancelledRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Check if operation was cancelled (timeout occurred)
      if (isCancelledRef.current) {
        console.log('loadRecordings was cancelled, skipping state updates');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:88',message:'CANCELLED after query',data:{queryDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return;
      }
      
      if (fetchError) {
        setError('שגיאה בטעינת ההקלטות. אנא נסה שוב.')
        console.error('Error loading recordings:', fetchError)
        // Don't clear recordings on error - keep showing previous page
        // But still reset ref and clear timeout
        if (timeoutId) clearTimeout(timeoutId);
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
        
        // Check again before updating state
        if (isCancelledRef.current) {
          console.log('loadRecordings was cancelled before state update, skipping');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:122',message:'CANCELLED before setRecordings',data:{processedLength:processed.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return;
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:125',message:'SETTING recordings state',data:{processedLength:processed.length,totalCount:total},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setRecordings(processed)
        setTotalCount(total || 0)
        
        // Load tags only for current page recordings (much faster)
        if (processed.length > 0) {
          const recordingIds = processed.map((r: any) => r.id)
          const { data: tagsData } = await getTagsByContentBatch('recording', recordingIds)
          
          // Check again before updating tags
          if (isCancelledRef.current) {
            console.log('loadRecordings was cancelled before tags update, skipping');
            return;
          }
          
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
          // No recordings found for this page
          setRecordingTags({})
        }
      } else {
        setError('לא נמצאו הקלטות')
        setRecordings([])
        setRecordingTags({})
      }
    } catch (err: any) {
      // Only update error state if not cancelled
      if (!isCancelledRef.current) {
        setError('שגיאה בטעינת ההקלטות. אנא נסה שוב.')
        console.error('Error loading recordings:', err)
      }
      // Don't clear recordings on error - keep showing previous page
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      // Only update loading state if not cancelled
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings/page.tsx:167',message:'loadRecordings FINALLY',data:{isCancelled:isCancelledRef.current,willUpdateLoading:!isCancelledRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!isCancelledRef.current) {
        setLoading(false);
        setPaginationLoading(false);
      }
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
    if (!userIsPremium) {
      alert('גישה להקלטות זמינה למנויי פרימיום בלבד. אנא שדרג את המנוי שלך כדי לצפות בהקלטות.');
      return;
    }
    router.push(`/recordings/${recordingId}`);
  }

  // Get unique tags from current page recordings - memoized for performance
  // Note: With pagination, we only have tags for current page, so filter options are limited
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    Object.values(recordingTags).forEach(tags => {
      tags.forEach(tag => tagSet.add(tag.name))
    })
    return ['all', ...Array.from(tagSet).sort()]
  }, [recordingTags])

  // Filter recordings on current page based on search and tags - memoized for performance
  // Note: With server-side pagination, filtering is limited to current page
  const filteredRecordingsOnPage = useMemo(() => {
    return recordings.filter(recording => {
      // Filter by tag
      if (activeFilter !== 'all') {
        const tags = recordingTags[recording.id] || []
        const tagNames = tags.map(t => t.name)
        if (!tagNames.includes(activeFilter)) return false
      }
      
      // Filter by search query
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      const tags = recordingTags[recording.id] || []
      const tagNames = tags.map(t => t.name).join(' ')
      return (
        recording.title?.toLowerCase().includes(query) ||
        recording.description?.toLowerCase().includes(query) ||
        tagNames.toLowerCase().includes(query)
      )
    })
  }, [recordings, recordingTags, activeFilter, searchQuery])

  // Pagination calculations - use totalCount from server for total pages
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const paginatedRecordings = filteredRecordingsOnPage

  // Reset to page 1 when filters or sort change (only if not already on page 1)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [activeFilter, searchQuery, sortBy])


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

        {/* Filter Bar */}
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          {allTags.map((tagName) => (
            <button
              key={tagName}
              onClick={() => setActiveFilter(tagName)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === tagName
                  ? 'bg-[#F52F8E] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tagName === 'all' ? 'הכל' : tagName}
            </button>
          ))}
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
          {!loading && !paginationLoading && paginatedRecordings.length > 0 && paginatedRecordings.map((recording) => (
            <div
              key={recording.id}
              onClick={() => handleRecordingClick(recording.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative flex flex-col h-full"
            >
              {/* Show lock overlay only when user loading is complete, user is logged in, and user is not premium */}
              {!userLoading && currentUser && !userIsPremium ? (
                <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-xl">
                  <div className="text-center text-white p-4">
                    <Lock className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-semibold">מנוי פרימיום נדרש</p>
                  </div>
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

                {/* Description */}
                {recording.description && (() => {
                  // Check if description contains HTML tags
                  const hasHTML = /<[a-z][\s\S]*>/i.test(recording.description);
                  
                  if (hasHTML) {
                    // For HTML content, render it but limit the height with CSS
                    return (
                      <div 
                        className="text-sm text-gray-600 mb-4 line-clamp-2 prose prose-sm max-w-none [&_p]:mb-1 [&_p]:text-sm [&_ul]:list-disc [&_ul]:mr-4 [&_ol]:list-decimal [&_ol]:mr-4 [&_li]:mb-0 [&_strong]:font-semibold [&_em]:italic"
                        style={{ direction: 'rtl', textAlign: 'right' }}
                        dangerouslySetInnerHTML={{ __html: recording.description }}
                      />
                    );
                  } else {
                    // For plain text, display normally
                    return (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {recording.description}
                      </p>
                    );
                  }
                })()}

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
        {paginatedRecordings.length === 0 && !loading && !paginationLoading && (
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
        {paginatedRecordings.length > 0 && !loading && !paginationLoading && (
          <div className="mt-4 text-center text-sm text-gray-600">
            מציג {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} מתוך {totalCount} הקלטות
          </div>
        )}
      </div>
    </div>
  )
}

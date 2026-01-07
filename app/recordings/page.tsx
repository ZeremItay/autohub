'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAllRecordings } from '@/lib/queries/recordings';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { isPremiumUser } from '@/lib/utils/user';
import { formatDate } from '@/lib/utils/date';
import { getTagsByContent, type Tag } from '@/lib/queries/tags';
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
  ChevronRight
} from 'lucide-react';

export default function RecordingsPage() {
  const router = useRouter();
  const { user: currentUser, isPremium: userIsPremium, loading: userLoading } = useCurrentUser();
  const [recordings, setRecordings] = useState<any[]>([])
  const [recordingTags, setRecordingTags] = useState<Record<string, Tag[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recently-active')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeFilter, setActiveFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  useEffect(() => {
    // Load recordings immediately, don't wait for user
    loadRecordings()
  }, [sortBy])

  function handleRecordingClick(recordingId: string) {
    if (!userIsPremium) {
      alert('גישה להקלטות זמינה למנויי פרימיום בלבד. אנא שדרג את המנוי שלך כדי לצפות בהקלטות.');
      return;
    }
    router.push(`/recordings/${recordingId}`);
  }

  async function loadRecordings() {
    setLoading(true)
    try {
      const { data, error } = await getAllRecordings()
      if (!error && data) {
        // Data is already sorted by created_at DESC from the query
        // Just apply additional sorting if needed
        let sorted = Array.isArray(data) ? [...data] : []
        if (sortBy === 'views') {
          sorted.sort((a, b) => (b.views || 0) - (a.views || 0))
        }
        // For 'recently-active', data is already sorted by created_at DESC from query
        
        // Optimize: Find newest recording in one pass during sort
        if (sorted.length > 0 && sortBy === 'recently-active') {
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
          // First recording is already the newest (sorted by created_at DESC)
          const newestRecording = sorted[0]
          const newestDate = new Date(newestRecording.created_at || newestRecording.updated_at || 0).getTime()
          
          if (newestDate > thirtyDaysAgo) {
            sorted[0] = { ...sorted[0], is_new: true }
          }
        }
        
        setRecordings(sorted)
        
        // Load tags for all recordings
        if (sorted.length > 0) {
          const tagsPromises = sorted.map(async (recording: any) => {
            const { data: tagsData } = await getTagsByContent('recording', recording.id)
            const tags = (Array.isArray(tagsData) ? tagsData.map((t: any) => t.tag).filter(Boolean) : []) || []
            return { recordingId: recording.id, tags }
          })
          const tagsResults = await Promise.all(tagsPromises)
          const tagsMap: Record<string, Tag[]> = {}
          tagsResults.forEach(({ recordingId, tags }) => {
            tagsMap[recordingId] = tags
          })
          setRecordingTags(tagsMap)
        }
      }
    } catch (error) {
      console.error('Error loading recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique tags from all recordings - memoized for performance
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    Object.values(recordingTags).forEach(tags => {
      tags.forEach(tag => tagSet.add(tag.name))
    })
    return ['all', ...Array.from(tagSet).sort()]
  }, [recordingTags])

  // Filter recordings based on search and tags - memoized for performance
  const filteredRecordings = useMemo(() => {
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecordings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecordings = filteredRecordings.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, searchQuery])


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

        {/* Recordings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedRecordings.map((recording) => (
            <div
              key={recording.id}
              onClick={() => handleRecordingClick(recording.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative flex flex-col h-full"
            >
              {/* Show lock overlay only when user loading is complete and user is not premium */}
              {!userLoading && !userIsPremium ? (
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
                  // Show thumbnail image if available
                  <img
                    src={recording.thumbnail_url}
                    alt={recording.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to gradient if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500';
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
        {filteredRecordings.length === 0 && !loading && (
          <div className="text-center py-12">
            <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">לא נמצאו הקלטות</p>
          </div>
        )}

        {/* Loading State - Only show if recordings are loading, not user */}
        {loading && recordings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-[#F52F8E] text-xl">טוען הקלטות...</div>
          </div>
        )}

        {/* Pagination */}
        {filteredRecordings.length > itemsPerPage && !loading && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center justify-center gap-4 w-full">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
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
                        className={`w-10 h-10 rounded-lg font-medium transition-colors flex items-center justify-center ${
                          currentPage === page
                            ? 'bg-[#F52F8E] text-white'
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
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                }`}
              >
                הבא
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page Info */}
        {filteredRecordings.length > 0 && !loading && (
          <div className="mt-4 text-center text-sm text-gray-600">
            מציג {startIndex + 1}-{Math.min(endIndex, filteredRecordings.length)} מתוך {filteredRecordings.length} הקלטות
          </div>
        )}
      </div>
    </div>
  )
}

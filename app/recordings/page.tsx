'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllRecordings } from '@/lib/queries/recordings';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { isPremiumUser } from '@/lib/utils/user';
import { formatDate } from '@/lib/utils/date';
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
  Lock
} from 'lucide-react';

export default function RecordingsPage() {
  const router = useRouter();
  const { user: currentUser, isPremium: userIsPremium, loading: userLoading } = useCurrentUser();
  const [recordings, setRecordings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recently-active')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    // Load recordings first (critical)
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
        let sorted = [...data]
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
      }
    } catch (error) {
      console.error('Error loading recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique categories from all recordings (flatten arrays)
  const allCategories = recordings
    .flatMap(r => {
      if (Array.isArray(r.category)) {
        return r.category;
      } else if (r.category) {
        return [r.category];
      }
      return [];
    })
    .filter(Boolean);
  const categories = ['all', ...new Set(allCategories)]

  // Filter recordings based on search and category
  const filteredRecordings = recordings.filter(recording => {
    if (activeFilter !== 'all') {
      const recordingCategories = Array.isArray(recording.category) 
        ? recording.category 
        : recording.category 
          ? [recording.category] 
          : [];
      if (!recordingCategories.includes(activeFilter)) return false;
    }
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const recordingCategories = Array.isArray(recording.category) 
      ? recording.category.join(' ') 
      : recording.category || '';
    return (
      recording.title?.toLowerCase().includes(query) ||
      recording.description?.toLowerCase().includes(query) ||
      recordingCategories.toLowerCase().includes(query)
    )
  })


  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
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
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === category
                  ? 'bg-[#F52F8E] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {category === 'all' ? 'הכל' : category}
            </button>
          ))}
        </div>

        {/* Recordings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map((recording) => (
            <div
              key={recording.id}
              onClick={() => handleRecordingClick(recording.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative flex flex-col h-full"
            >
              {!userLoading && !userIsPremium && (
                <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-xl">
                  <div className="text-center text-white p-4">
                    <Lock className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-semibold">מנוי פרימיום נדרש</p>
                  </div>
                </div>
              )}
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
                {/* Categories */}
                {recording.category && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {Array.isArray(recording.category) ? (
                      recording.category.map((cat, idx) => (
                        <span key={idx} className="text-xs font-semibold text-[#F52F8E] uppercase px-2 py-1 bg-pink-50 rounded">
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-semibold text-[#F52F8E] uppercase px-2 py-1 bg-pink-50 rounded">
                        {recording.category}
                      </span>
                    )}
                  </div>
                )}

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-[#F52F8E] transition-colors flex-shrink-0">
                  {recording.title}
                </h3>

                {/* Description */}
                {recording.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {recording.description}
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
        {filteredRecordings.length === 0 && !loading && (
          <div className="text-center py-12">
            <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">לא נמצאו הקלטות</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-[#F52F8E] text-xl">טוען הקלטות...</div>
          </div>
        )}
      </div>
    </div>
  )
}

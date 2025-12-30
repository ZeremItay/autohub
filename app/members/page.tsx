'use client';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAllProfiles } from '@/lib/queries/profiles'
import { 
  Search, 
  Grid3x3, 
  List, 
  MoreVertical,
  Trophy,
  Star,
  Mail,
  ChevronDown
} from 'lucide-react'
import AuthGuard from '@/app/components/AuthGuard'

export default function MembersPage() {
  return (
    <AuthGuard requireAuth={true} fallbackMessage="האזור הזה הוא למחוברים בלבד">
      <MembersPageContent />
    </AuthGuard>
  );
}

function MembersPageContent() {
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recently-active')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
    loadCurrentUser()
  }, [sortBy])

  async function loadCurrentUser() {
    try {
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('selectedUserId') : null;
      if (savedUserId) {
        setCurrentUserId(savedUserId);
      } else {
        // Get first user as default
        const { data: profiles } = await getAllProfiles();
        if (Array.isArray(profiles) && profiles.length > 0) {
          const userId = profiles[0].user_id || profiles[0].id;
          setCurrentUserId(userId);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  function handleSendMessage(member: any) {
    // Save the conversation partner to localStorage
    const partnerId = member.user_id || member.id;
    if (partnerId && typeof window !== 'undefined') {
      localStorage.setItem('messagePartnerId', partnerId);
      localStorage.setItem('messagePartnerName', member.display_name || member.nickname || 'משתמש');
      // Navigate to messages page
      router.push('/messages');
    }
  }

  async function loadMembers() {
    setLoading(true)
    try {
      const { data, error } = await getAllProfiles()
      if (!error && data) {
        // Sort members based on sortBy
        let sorted = Array.isArray(data) ? [...data] : []
        if (sortBy === 'recently-active') {
          sorted.sort((a, b) => {
            const aDate = new Date(a.updated_at || a.created_at).getTime()
            const bDate = new Date(b.updated_at || b.created_at).getTime()
            return bDate - aDate
          })
        } else if (sortBy === 'points') {
          sorted.sort((a, b) => (b.points || 0) - (a.points || 0))
        } else if (sortBy === 'rank') {
          sorted.sort((a, b) => (a.rank || 0) - (b.rank || 0))
        }
        setMembers(sorted)
      }
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter members based on search
  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      member.display_name?.toLowerCase().includes(query) ||
      member.nickname?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    )
  })

  function formatJoinDate(dateString: string) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
  }

  function getLastActiveText(member: any) {
    if (member.is_online) return 'פעיל עכשיו'
    if (!member.updated_at) return 'לא פעיל'
    const updated = new Date(member.updated_at)
    const now = new Date()
    const diffMs = now.getTime() - updated.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffDays === 0) {
      if (diffHours === 0) return 'פעיל עכשיו'
      return `פעיל לפני ${diffHours} שעות`
    } else if (diffDays === 1) {
      return 'פעיל אתמול'
    } else {
      return `פעיל לפני ${diffDays} ימים`
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-800">חברים</h1>
              <button className="px-3 py-1.5 border-b-2 border-[#F52F8E] text-[#F52F8E] font-medium text-sm">
                כל המשתמשים
              </button>
            </div>
            
            {/* Search - Mobile */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="חיפוש חברים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent bg-white text-sm"
              />
            </div>

            {/* Filters - Mobile */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-gray-600">
                {filteredMembers.length} משתמשים
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none px-2 py-1.5 pr-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] bg-white text-xs"
                >
                  <option value="recently-active">פעילים לאחרונה</option>
                  <option value="points">נקודות</option>
                  <option value="rank">דרגה</option>
                </select>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-[#F52F8E] shadow-sm'
                        : 'text-gray-600'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-[#F52F8E] shadow-sm'
                        : 'text-gray-600'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              {/* Right: Title and Tab */}
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-bold text-gray-800">חברים</h1>
                <button className="px-4 py-2 border-b-2 border-[#F52F8E] text-[#F52F8E] font-medium">
                  כל המשתמשים
                </button>
              </div>

              {/* Left: Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="חיפוש חברים..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex items-center justify-between">
              {/* Right: Member Count */}
              <div className="text-sm text-gray-600">
                {filteredMembers.length} משתמשים
              </div>

              {/* Left: Sort and View Toggle */}
              <div className="flex items-center gap-4">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] bg-white text-sm"
                  >
                    <option value="recently-active">פעילים לאחרונה</option>
                    <option value="points">נקודות (גבוה לנמוך)</option>
                    <option value="rank">דרגה (נמוך לגבוה)</option>
                  </select>
                  <ChevronDown className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-[#F52F8E] shadow-sm'
                        : 'text-gray-600 hover:text-[#F52F8E]'
                    }`}
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-[#F52F8E] shadow-sm'
                        : 'text-gray-600 hover:text-[#F52F8E]'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8`}>
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-[#F52F8E] text-lg sm:text-xl">טוען חברים...</div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-sm sm:text-base text-gray-500">לא נמצאו חברים</p>
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredMembers.map((member) => (
                    <MemberCard key={member.id} member={member} formatJoinDate={formatJoinDate} getLastActiveText={getLastActiveText} handleSendMessage={handleSendMessage} />
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-3 sm:space-y-4">
                  {filteredMembers.map((member) => (
                    <MemberCardList key={member.id} member={member} formatJoinDate={formatJoinDate} getLastActiveText={getLastActiveText} handleSendMessage={handleSendMessage} />
                  ))}
                </div>
              )}

              {/* Pagination Info */}
              <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 text-right">
                מציג 1-{filteredMembers.length} מתוך {filteredMembers.length} חברים
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Member Card Component (Grid)
function MemberCard({ member, formatJoinDate, getLastActiveText, handleSendMessage }: any) {
  const displayName = member.display_name || member.nickname || 'משתמש'
  const points = member.points || 0
  const rank = member.rank || 1
  const joinDate = formatJoinDate(member.created_at)
  const lastActive = getLastActiveText(member)
  
  const handleMemberClick = () => {
    // Save selected user to localStorage
    const userId = member.user_id || member.id;
    if (userId && typeof window !== 'undefined') {
      localStorage.setItem('selectedUserId', userId);
      // Reload page to update current user
      window.location.href = '/profile';
    }
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 relative cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleMemberClick}
    >
      {/* Three Dots Menu */}
      <button 
        className="absolute top-3 sm:top-4 left-3 sm:left-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Add menu functionality
        }}
      >
        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-3 sm:mb-4">
        <div className="relative mb-3 sm:mb-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{displayName.charAt(0)}</span>
            )}
          </div>
          {member.is_online && (
            <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-3 sm:border-4 border-white"></div>
          )}
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap justify-center">
          <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-[#F52F8E] text-white rounded-full text-xs font-semibold flex items-center gap-1">
            <Star className="w-3 h-3" />
            {points} נק'
          </span>
          <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {rank} דירוג
          </span>
        </div>

        {/* Name */}
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1 sm:mb-2 text-center">{displayName}</h3>

        {/* Meta Data */}
        <p className="text-xs sm:text-sm text-[#F52F8E] text-center mb-3 sm:mb-4">
          {joinDate && `הצטרף ${joinDate}`}
          {joinDate && lastActive && ' • '}
          {lastActive}
        </p>

        {/* Send Message Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleSendMessage(member);
          }}
          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-300 rounded-lg hover:border-[#F52F8E] hover:text-[#F52F8E] transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
        >
          <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
          שליחת הודעה
        </button>
      </div>
    </div>
  )
}

// Member Card Component (List)
function MemberCardList({ member, formatJoinDate, getLastActiveText, handleSendMessage }: any) {
  const displayName = member.display_name || member.nickname || 'משתמש'
  const points = member.points || 0
  const rank = member.rank || 1
  const joinDate = formatJoinDate(member.created_at)
  const lastActive = getLastActiveText(member)
  
  const handleMemberClick = () => {
    // Save selected user to localStorage
    const userId = member.user_id || member.id;
    if (userId && typeof window !== 'undefined') {
      localStorage.setItem('selectedUserId', userId);
      // Reload page to update current user
      window.location.href = '/profile';
    }
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleMemberClick}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white text-lg sm:text-xl font-bold">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{displayName.charAt(0)}</span>
            )}
          </div>
          {member.is_online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2 gap-1 sm:gap-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 break-words">{displayName}</h3>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#F52F8E] text-white rounded-full text-xs font-semibold flex items-center gap-1">
                <Star className="w-3 h-3" />
                <span className="hidden sm:inline">{points} נק'</span>
                <span className="sm:hidden">{points}</span>
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {rank}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#F52F8E] break-words">
            {joinDate && `הצטרף ${joinDate}`}
            {joinDate && lastActive && ' • '}
            {lastActive}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleSendMessage(member);
            }}
            className="px-2 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-300 rounded-lg hover:border-[#F52F8E] hover:text-[#F52F8E] transition-colors flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm"
          >
            <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">שליחת הודעה</span>
            <span className="sm:hidden">הודעה</span>
          </button>
          <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}


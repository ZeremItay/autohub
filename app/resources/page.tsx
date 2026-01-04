'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Download, 
  Heart, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon, 
  Music,
  Plus,
  X,
  Search,
  Filter,
  Upload,
  Eye,
  Calendar,
  User as UserIcon
} from 'lucide-react';
import { getAllTags, suggestTag, assignTagsToContent, type Tag } from '@/lib/queries/tags';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { formatTimeAgo } from '@/lib/utils/date';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Tag Selector Component (from projects page)
function TagSelectorWithCreate({ 
  selectedTagIds, 
  onSelectionChange, 
  availableTags,
  onNewTagCreate
}: { 
  selectedTagIds: string[], 
  onSelectionChange: (tagIds: string[]) => void,
  availableTags: Tag[],
  onNewTagCreate: (tagName: string) => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = useMemo(() => {
    if (!searchQuery) return availableTags;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return availableTags;
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(query) ||
      tag.description?.toLowerCase().includes(query)
    );
  }, [availableTags, searchQuery]);

  const selectedTags = useMemo(() => {
    return availableTags.filter(tag => selectedTagIds.includes(tag.id));
  }, [availableTags, selectedTagIds]);

  const shouldShowCreateOption = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase().trim();
    const exists = availableTags.some(tag => 
      tag.name.toLowerCase() === query ||
      tag.name.toLowerCase().includes(query)
    );
    return !exists && query.length > 0;
  }, [searchQuery, availableTags]);

  function toggleTag(tagId: string) {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onSelectionChange(newSelection);
  }

  async function handleCreateNewTag() {
    if (!searchQuery.trim()) return;
    await onNewTagCreate(searchQuery.trim());
    setSearchQuery('');
  }

  return (
    <div className="relative">
      <div 
        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white cursor-pointer min-h-[46px] flex items-center flex-wrap gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#F52F8E] text-white text-xs rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleTag(tag.id);
              }}
            >
              {tag.name}
              <X className="w-3 h-3" />
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-sm">בחר תגיות או חפש להוסיף חדשות...</span>
        )}
      </div>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />
          <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl overflow-hidden" style={{ maxHeight: 'min(300px, calc(100vh - 200px))', maxWidth: 'calc(100vw - 2rem)' }}>
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="חפש תגיות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && shouldShowCreateOption) {
                    e.preventDefault();
                    handleCreateNewTag();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                dir="rtl"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-[240px]">
              {shouldShowCreateOption && (
                <div
                  className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-200 bg-blue-50/50 flex items-center justify-between"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleCreateNewTag();
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Plus className="w-4 h-4 text-[#F52F8E] flex-shrink-0" />
                    <span className="font-semibold text-[#F52F8E] truncate text-sm">
                      הוסף תגית חדשה: "{searchQuery}"
                    </span>
                  </div>
                </div>
              )}
              {filteredTags.length > 0 ? (
                filteredTags.map(tag => (
                  <div
                    key={tag.id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                      selectedTagIds.includes(tag.id) ? 'bg-[#F52F8E]/10' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTag(tag.id);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {tag.icon && <span className="flex-shrink-0">{tag.icon}</span>}
                      <span className={`flex-shrink-0 text-sm sm:text-base ${selectedTagIds.includes(tag.id) ? 'font-semibold' : ''}`}>
                        {tag.name}
                      </span>
                      {tag.description && (
                        <span className="text-xs text-gray-500 truncate hidden sm:inline">- {tag.description}</span>
                      )}
                    </div>
                    {selectedTagIds.includes(tag.id) && (
                      <span className="text-[#F52F8E] flex-shrink-0">✓</span>
                    )}
                  </div>
                ))
              ) : !shouldShowCreateOption && (
                <div className="px-4 py-2 text-gray-500 text-sm text-center">
                  {searchQuery ? 'לא נמצאו תגיות' : 'התחל להקליד כדי לחפש תגיות'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [resourceTags, setResourceTags] = useState<Record<string, Tag[]>>({});

  const [newResource, setNewResource] = useState({
    type: 'document' as 'document' | 'video' | 'image' | 'link' | 'audio',
    title: '',
    description: '',
    category: '',
    file: null as File | null,
    file_url: '',
    external_url: '',
    thumbnail: null as File | null,
    thumbnail_url: '',
    selectedTagIds: [] as string[]
  });

  useEffect(() => {
    loadData();
    loadTags();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch('/api/resources');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch resources' }));
        console.error('Error loading resources:', errorData.error || 'Unknown error');
        setResources([]);
        return;
      }
      
      const { data, error } = await response.json();
      
      if (error) {
        console.error('Error loading resources:', error);
        setResources([]);
        return;
      }

      setResources(data || []);
      
      // Load tags for each resource
      if (data && data.length > 0) {
        const { getTagsByContent } = await import('@/lib/queries/tags');
        const tagsPromises = data.map(async (resource: any) => {
          const { data: tagsData } = await getTagsByContent('resource', resource.id);
          const tags = (Array.isArray(tagsData) ? tagsData.map((t: any) => t.tag).filter(Boolean) : []) || [];
          return { resourceId: resource.id, tags };
        });
        const tagsResults = await Promise.all(tagsPromises);
        const tagsMap: Record<string, Tag[]> = {};
        tagsResults.forEach(({ resourceId, tags }) => {
          tagsMap[resourceId] = tags;
        });
        setResourceTags(tagsMap);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTags() {
    const { data } = await getAllTags(false);
    if (data && Array.isArray(data)) {
      setAvailableTags(data);
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getTypeColor(type?: string) {
    switch (type) {
      case 'document': return 'bg-blue-100 text-blue-700';
      case 'video': return 'bg-pink-100 text-pink-700';
      case 'image': return 'bg-green-100 text-green-700';
      case 'link': return 'bg-purple-100 text-purple-700';
      case 'audio': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function getTypeIcon(type?: string) {
    switch (type) {
      case 'document': return <FileText className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  }

  function getTypeLabel(type?: string) {
    switch (type) {
      case 'document': return 'מסמך';
      case 'video': return 'וידאו';
      case 'image': return 'תמונה';
      case 'link': return 'קישור';
      case 'audio': return 'אודיו';
      default: return 'מסמך';
    }
  }

  async function handleLike(resourceId: string) {
    if (!currentUser) {
      router.push('/auth/login?redirect=/resources');
      return;
    }

    try {
      const response = await fetch(`/api/resources/${resourceId}/like`, {
        method: 'POST'
      });
      const { data } = await response.json();
      
      if (data) {
        // Update local state
        setResources(prev => prev.map(r => 
          r.id === resourceId 
            ? { ...r, is_liked: data.liked, likes_count: data.likes_count }
            : r
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  async function handleDownload(resource: any) {
    try {
      await fetch(`/api/resources/${resource.id}/download`, {
        method: 'POST'
      });

      if (resource.type === 'link' && resource.external_url) {
        window.open(resource.external_url, '_blank');
      } else {
      window.open(resource.file_url, '_blank');
      }

      // Update download count
      setResources(prev => prev.map(r => 
        r.id === resource.id 
          ? { ...r, download_count: (r.download_count || 0) + 1 }
          : r
      ));
    } catch (error) {
      console.error('Error downloading resource:', error);
    }
  }

  async function handleUpload() {
    if (!newResource.title || !newResource.type) {
      alert('אנא מלא את כל השדות הנדרשים');
      return;
    }

    if (newResource.type !== 'link' && !newResource.file && !newResource.file_url) {
      alert('אנא העלה קובץ או הזן קישור');
      return;
    }

    if (newResource.type === 'link' && !newResource.external_url) {
      alert('אנא הזן קישור חיצוני');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = newResource.file_url;
      let thumbnailUrl = newResource.thumbnail_url;

      // Upload file if provided
      if (newResource.file) {
        const fileExt = newResource.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `resources/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, newResource.file);

        if (uploadError) {
          // Try avatars bucket as fallback
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('avatars')
            .upload(filePath, newResource.file);
          
          if (fallbackError) {
            throw new Error('Failed to upload file');
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          fileUrl = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('resources')
            .getPublicUrl(filePath);
          fileUrl = publicUrl;
        }
      }

      // Upload thumbnail if provided
      if (newResource.thumbnail) {
        const fileExt = newResource.thumbnail.name.split('.').pop();
        const fileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `resources/thumbnails/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, newResource.thumbnail);

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('resources')
            .getPublicUrl(filePath);
          thumbnailUrl = publicUrl;
        }
      }

      // Create resource
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newResource.title,
          description: newResource.description,
          type: newResource.type,
          category: newResource.category || null,
          file_url: fileUrl,
          file_name: newResource.file?.name || newResource.title,
          file_size: newResource.file?.size,
          file_type: newResource.file?.type,
          external_url: newResource.type === 'link' ? newResource.external_url : null,
          thumbnail_url: thumbnailUrl || null,
          is_premium: false,
          tagIds: newResource.selectedTagIds
        })
      });

      const { data: resourceData, error: resourceError } = await response.json();

      if (resourceError || !resourceData) {
        throw new Error(resourceError || 'Failed to create resource');
      }

      // Reset form
      setNewResource({
        type: 'document',
        title: '',
        description: '',
        category: '',
        file: null,
        file_url: '',
        external_url: '',
        thumbnail: null,
        thumbnail_url: '',
        selectedTagIds: []
      });
      setShowUploadModal(false);
      
      // Reload resources
      await loadData();
      alert('המשאב נוצר בהצלחה!');
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      alert(`שגיאה בהעלאת המשאב: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set<string>();
    resources.forEach(r => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats);
  }, [resources]);

  const filteredResources = useMemo(() => {
    let filtered = resources;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [resources, selectedType, selectedCategory, searchQuery]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: resources.length,
      document: 0,
      video: 0,
      image: 0,
      link: 0,
      audio: 0
    };
    resources.forEach(r => {
      if (r.type && counts[r.type] !== undefined) {
        counts[r.type]++;
      }
    });
    return counts;
  }, [resources]);

  if (loading) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">ספריית המשאבים</h1>
            <p className="text-sm sm:text-base text-gray-600">מסמכים, הדרכות, כלים ותוכן שימושי לקהילה</p>
          </div>
          <button
            onClick={() => {
              if (!currentUser) {
                router.push('/auth/login?redirect=/resources');
                return;
              }
              setShowUploadModal(true);
            }}
            className="btn-modern flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-xl text-sm sm:text-base font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            העלאת משאב
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search and Category */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="חיפוש משאבים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base"
                dir="rtl"
              />
            </div>
            <div className="relative sm:w-48">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base appearance-none bg-white"
                dir="rtl"
              >
                <option value="all">כל הקטגוריות</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Tabs */}
          <div className="flex flex-wrap gap-2">
            {['all', 'document', 'video', 'image', 'link', 'audio'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                  selectedType === type
                    ? 'bg-[#F52F8E] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {type === 'all' ? `הכל (${typeCounts.all})` : `${getTypeLabel(type)} (${typeCounts[type] || 0})`}
              </button>
            ))}
          </div>

          {/* Count */}
          <p className="text-sm text-gray-600">
            {filteredResources.length} משאבים נמצאו
          </p>
          </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">אין משאבים זמינים כרגע</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredResources.map((resource) => {
              const tags = resourceTags[resource.id] || [];
              return (
              <div
                key={resource.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-all"
                >
                  {/* Thumbnail or Icon */}
                  {resource.thumbnail_url ? (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img 
                        src={resource.thumbnail_url} 
                        alt={resource.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`mb-4 w-full h-48 ${getTypeColor(resource.type)} rounded-lg flex items-center justify-center`}>
                      {getTypeIcon(resource.type)}
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getTypeColor(resource.type)}`}>
                      {getTypeIcon(resource.type)}
                      {getTypeLabel(resource.type)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                      {resource.title}
                    </h3>

                  {/* Description */}
                    {resource.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {resource.description}
                      </p>
                    )}

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.slice(0, 3).map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{tags.length - 3}
                      </span>
                      )}
                    </div>
                  )}

                  {/* Author and Date */}
                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                    {resource.author?.avatar_url ? (
                      <img 
                        src={resource.author.avatar_url} 
                        alt={resource.author.display_name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white text-xs">
                        {(resource.author?.display_name || 'א').charAt(0)}
                      </div>
                    )}
                    <span>{resource.author?.display_name || 'משתמש'}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(resource.created_at)}</span>
                </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                    <button
                      onClick={() => handleLike(resource.id)}
                      className={`flex items-center gap-1 transition-colors ${
                        resource.is_liked ? 'text-[#F52F8E]' : 'text-gray-600 hover:text-[#F52F8E]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${resource.is_liked ? 'fill-current' : ''}`} />
                      <span>{resource.likes_count || 0}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                  <span>{formatFileSize(resource.file_size)}</span>
                    </div>
                </div>

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(resource)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-medium text-sm"
                  >
                    {resource.type === 'link' ? (
                      <>
                        <LinkIcon className="w-4 h-4" />
                        <span>פתח קישור</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                    <span>הורד</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => !uploading && setShowUploadModal(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">העלאת משאב חדש</h2>
                <button
                  onClick={() => !uploading && setShowUploadModal(false)}
                  disabled={uploading}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    סוג משאב *
                  </label>
                  <select
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm"
                    dir="rtl"
                  >
                    <option value="document">מסמך</option>
                    <option value="video">וידאו</option>
                    <option value="image">תמונה</option>
                    <option value="link">קישור</option>
                    <option value="audio">אודיו</option>
                  </select>
                </div>

                {/* File Upload or External URL */}
                {newResource.type === 'link' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      קישור חיצוני *
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newResource.external_url}
                      onChange={(e) => setNewResource({ ...newResource, external_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm"
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      קובץ *
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setNewResource({ ...newResource, file: e.target.files?.[0] || null })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm"
                      accept={newResource.type === 'image' ? 'image/*' : newResource.type === 'video' ? 'video/*' : newResource.type === 'audio' ? 'audio/*' : '*'}
                    />
                    <p className="text-xs text-gray-500 mt-1">או הזן קישור ישיר:</p>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newResource.file_url}
                      onChange={(e) => setNewResource({ ...newResource, file_url: e.target.value })}
                      className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm"
                      dir="ltr"
                    />
                  </div>
                )}

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    תמונת תצוגה מקדימה (אופציונלי)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewResource({ ...newResource, thumbnail: e.target.files?.[0] || null })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    כותרת *
                  </label>
                  <input
                    type="text"
                    placeholder="לדוגמה: מדריך למתחילים בפיתוח אתרים"
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm"
                    dir="rtl"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    תיאור
                  </label>
                  <textarea
                    placeholder="תאר את המשאב..."
                    value={newResource.description}
                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm resize-none"
                    dir="rtl"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    קטגוריה
                  </label>
                  <input
                    type="text"
                    placeholder="לדוגמה: הדרכות, כלים, תבניות"
                    value={newResource.category}
                    onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm"
                    dir="rtl"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    תגיות
                  </label>
                  <TagSelectorWithCreate
                    selectedTagIds={newResource.selectedTagIds}
                    onSelectionChange={(tagIds) => setNewResource({ ...newResource, selectedTagIds: tagIds })}
                    availableTags={availableTags}
                    onNewTagCreate={async (tagName: string) => {
                      const { data: newTag, error: tagError } = await suggestTag(tagName);
                      if (newTag && !tagError) {
                        setAvailableTags(prev => [...prev, newTag]);
                        setNewResource({ 
                          ...newResource, 
                          selectedTagIds: [...newResource.selectedTagIds, newTag.id] 
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-2.5 bg-[#F52F8E] text-white rounded-xl hover:bg-[#E01E7A] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      מעלה...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      העלה משאב
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

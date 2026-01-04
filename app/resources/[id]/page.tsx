'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Download, 
  Heart, 
  Bookmark, 
  Share2,
  FileText, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon, 
  Music,
  Calendar,
  ArrowRight,
  User as UserIcon,
  Check,
  Copy,
  Facebook,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { getTagsByContent, getContentByTag, type Tag } from '@/lib/queries/tags';
import { getResourcesWithDetails } from '@/lib/queries/resources';
import { formatDate } from '@/lib/utils/date';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

function ResourceDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const resourceId = params.id as string;
  
  const [resource, setResource] = useState<any>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [relatedResources, setRelatedResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (resourceId) {
      loadResource();
    }
  }, [resourceId]);

  async function loadResource() {
    setLoading(true);
    try {
      // Load resource data
      const response = await fetch(`/api/resources/${resourceId}`);
      if (!response.ok) {
        console.error('Error loading resource:', response.status);
        setLoading(false);
        return;
      }
      
      const { data, error } = await response.json();
      if (error || !data) {
        console.error('Error loading resource:', error);
        setLoading(false);
        return;
      }

      setResource(data);
      setLiked(data.is_liked || false);
      setLikesCount(data.likes_count || 0);

      // Load tags
      const { data: tagsData } = await getTagsByContent('resource', resourceId);
      const resourceTags = (Array.isArray(tagsData) ? tagsData.map((t: any) => t.tag).filter(Boolean) : []) || [];
      setTags(resourceTags);

      // Load related resources
      await loadRelatedResources(data, resourceTags);
    } catch (error) {
      console.error('Error loading resource:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRelatedResources(currentResource: any, resourceTags: Tag[]) {
    try {
      // Get all resources
      const { data: allResources } = await getResourcesWithDetails(currentUser?.id);
      if (!allResources || allResources.length === 0) {
        setRelatedResources([]);
        return;
      }

      // Filter related resources:
      // 1. Same category (priority)
      // 2. Same tags
      // 3. Exclude current resource
      const related: any[] = [];
      const currentResourceTagIds = resourceTags.map(t => t.id);
      
      // First, get resources with same category
      if (currentResource.category) {
        for (const res of allResources) {
          if (res.id === currentResource.id) continue;
          if (res.category === currentResource.category) {
            related.push(res);
            if (related.length >= 5) break;
          }
        }
      }

      // If we don't have enough, get resources with same tags
      if (related.length < 5 && currentResourceTagIds.length > 0) {
        // Load tags for all resources in parallel (optimized)
        const tagPromises = allResources
          .filter(res => res.id !== currentResource.id && !related.find(r => r.id === res.id))
          .slice(0, 20) // Limit to first 20 to avoid too many requests
          .map(async (res) => {
            const { data: resTagsData } = await getTagsByContent('resource', res.id);
            const resTags = (Array.isArray(resTagsData) ? resTagsData.map((t: any) => t.tag).filter(Boolean) : []) || [];
            const resTagIds = resTags.map((t: Tag) => t.id);
            const hasCommonTag = currentResourceTagIds.some(tagId => resTagIds.includes(tagId));
            return { resource: res, hasCommonTag };
          });

        const tagResults = await Promise.all(tagPromises);
        for (const { resource, hasCommonTag } of tagResults) {
          if (hasCommonTag && related.length < 5) {
            related.push(resource);
          }
        }
      }

      // Limit to 5 related resources
      setRelatedResources(related.slice(0, 5));
    } catch (error) {
      console.error('Error loading related resources:', error);
      setRelatedResources([]);
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      default: return 'משאב';
    }
  }

  function getTypeColor(type?: string) {
    switch (type) {
      case 'document': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'video': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'image': return 'bg-green-50 text-green-700 border-green-200';
      case 'link': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'audio': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  async function handleDownload() {
    if (!resource) return;

    try {
      // Increment download count
      await fetch(`/api/resources/${resourceId}/download`, {
        method: 'POST'
      });

      // If it's a link type, open external URL
      if (resource.type === 'link' && resource.external_url) {
        window.open(resource.external_url, '_blank');
      } else if (resource.file_url) {
        // For files, try to download them
        // If it's a direct file URL, create a download link
        const link = document.createElement('a');
        link.href = resource.file_url;
        link.download = resource.file_name || resource.title;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading resource:', error);
      // Fallback: open in new tab
      if (resource.type === 'link' && resource.external_url) {
        window.open(resource.external_url, '_blank');
      } else if (resource.file_url) {
        window.open(resource.file_url, '_blank');
      }
    }
  }

  async function handleLike() {
    if (!currentUser) {
      alert('נא להתחבר כדי לאהב משאבים');
      return;
    }

    try {
      const response = await fetch(`/api/resources/${resourceId}/like`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setLiked(result.data.liked || false);
          setLikesCount(result.data.likes_count || 0);
        } else {
          // Fallback: toggle locally
          setLiked(!liked);
          setLikesCount(prev => liked ? prev - 1 : prev + 1);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error toggling like:', errorData.error || 'Unknown error');
        alert('שגיאה בעדכון הלייק. נסה שוב.');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('שגיאה בעדכון הלייק. נסה שוב.');
    }
  }

  function handleSave() {
    if (!currentUser) {
      alert('נא להתחבר כדי לשמור משאבים');
      return;
    }
    // TODO: Implement bookmark system in database
    // For now, save to localStorage
    if (typeof window !== 'undefined') {
      const savedResources = JSON.parse(localStorage.getItem('savedResources') || '[]');
      if (saved) {
        // Remove from saved
        const updated = savedResources.filter((id: string) => id !== resourceId);
        localStorage.setItem('savedResources', JSON.stringify(updated));
        setSaved(false);
      } else {
        // Add to saved
        if (!savedResources.includes(resourceId)) {
          savedResources.push(resourceId);
          localStorage.setItem('savedResources', JSON.stringify(savedResources));
        }
        setSaved(true);
      }
    }
  }

  function handleShare(type: 'link' | 'whatsapp' | 'facebook' | 'twitter') {
    if (!resource) return;

    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = resource.title;
    const text = `${title} - מועדון האוטומטורים`;

    switch (type) {
      case 'link':
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
    }
    setShowShareMenu(false);
  }

  // Check if resource is saved on load
  useEffect(() => {
    if (resourceId && typeof window !== 'undefined') {
      const savedResources = JSON.parse(localStorage.getItem('savedResources') || '[]');
      setSaved(savedResources.includes(resourceId));
    }
  }, [resourceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">טוען משאב...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500 mb-4">משאב לא נמצא</p>
              <Link 
                href="/resources"
                className="inline-flex items-center gap-2 text-[#F52F8E] hover:text-[#E01E7A] transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה לספריית המשאבים
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/resources" className="hover:text-[#F52F8E] transition-colors">
                ספריית משאבים
              </Link>
              {resource.category && (
                <>
                  <span>/</span>
                  <span className="text-gray-400">{resource.category}</span>
                </>
              )}
            </div>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Uploaded by Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">הועלה על ידי</h3>
                {resource.author ? (
                  <div className="flex items-center gap-3">
                    {resource.author.avatar_url ? (
                      <img 
                        src={resource.author.avatar_url} 
                        alt={resource.author.display_name || 'משתמש'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800">
                        {resource.author.display_name || resource.author.first_name || resource.author.nickname || 'משתמש'}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(resource.created_at)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">לא זמין</p>
                )}
              </div>

              {/* File Details Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">פרטי הקובץ</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">סוג</span>
                    <span className="font-medium text-gray-800">{getTypeLabel(resource.type)}</span>
                  </div>
                  {resource.category && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">קטגוריה</span>
                      <span className="font-medium text-gray-800">{resource.category}</span>
                    </div>
                  )}
                  {resource.file_size && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">גודל</span>
                      <span className="font-medium text-gray-800">{formatFileSize(resource.file_size)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">הורדות</span>
                    <span className="font-medium text-gray-800">{resource.download_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Related Resources Card */}
              {relatedResources.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">משאבים קשורים</h3>
                  <div className="space-y-3">
                    {relatedResources.map((related) => (
                      <Link
                        key={related.id}
                        href={`/resources/${related.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className={`${getTypeColor(related.type)} p-2 rounded`}>
                          {getTypeIcon(related.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{related.title}</p>
                          <p className="text-xs text-gray-500">{related.download_count || 0} הורדות</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
                {/* Type and Category Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(resource.type)}`}>
                    {getTypeIcon(resource.type)}
                    {getTypeLabel(resource.type)}
                  </span>
                  {resource.category && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                      {resource.category}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
                  {resource.title}
                </h1>

                {/* Description */}
                {resource.description && (
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {resource.description}
                  </p>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 bg-pink-50 text-[#F52F8E] rounded-full text-sm font-medium"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex flex-wrap items-center gap-6 mb-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>{resource.download_count || 0} הורדות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    <span>{likesCount} לייקים</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(resource.created_at)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownload();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-medium cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {resource.type === 'link' ? 'פתח קישור' : `הורד ${resource.file_size ? `(${formatFileSize(resource.file_size)})` : ''}`}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLike();
                    }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors font-medium cursor-pointer ${
                      liked
                        ? 'bg-pink-50 text-[#F52F8E] border-pink-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                    אהבתי
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSave();
                    }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors font-medium cursor-pointer ${
                      saved
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                    שמור
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowShareMenu(!showShareMenu);
                      }}
                      className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      שתף
                    </button>
                    
                    {showShareMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowShareMenu(false)}
                        />
                        <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 min-w-[180px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShare('link');
                            }}
                            className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center justify-between gap-2 text-sm text-gray-700"
                          >
                            <span>{copied ? 'הועתק!' : 'העתק קישור'}</span>
                            {copied ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShare('whatsapp');
                            }}
                            className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center justify-between gap-2 text-sm text-gray-700"
                          >
                            <span>WhatsApp</span>
                            <MessageCircle className="w-4 h-4 text-green-500" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShare('facebook');
                            }}
                            className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center justify-between gap-2 text-sm text-gray-700"
                          >
                            <span>Facebook</span>
                            <Facebook className="w-4 h-4 text-blue-500" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShare('twitter');
                            }}
                            className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center justify-between gap-2 text-sm text-gray-700"
                          >
                            <span>Twitter</span>
                            <Twitter className="w-4 h-4 text-blue-400" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResourceDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">טוען משאב...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResourceDetailPageContent />
    </Suspense>
  );
}

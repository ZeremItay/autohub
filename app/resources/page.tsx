'use client';

import { useState, useEffect } from 'react';
import { Download, Lock, FileText, Image, Video, File, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getAllResources } from '@/lib/queries/resources';
import { getAllProfiles } from '@/lib/queries/profiles';

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load current user
      const { data: profiles } = await getAllProfiles();
      if (Array.isArray(profiles) && profiles.length > 0) {
        const user = profiles[0];
        setCurrentUser(user);
      }

      // Load resources
      const { data: resourcesData } = await getAllResources();
      if (resourcesData) {
        setResources(resourcesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function isPremiumUser(): boolean {
    if (!currentUser) return false;
    const role = currentUser.roles || currentUser.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    return roleName === 'premium' || roleName === 'admin';
  }

  function getFileIcon(fileType?: string) {
    if (!fileType) return <File className="w-5 h-5" />;
    
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5" />;
    } else if (fileType.startsWith('video/')) {
      return <Video className="w-5 h-5" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleDownload(resource: any) {
    if (!isPremiumUser()) {
      return; // Should not reach here, but just in case
    }

    try {
      // Increment download count
      await fetch(`/api/resources/${resource.id}/download`, {
        method: 'POST'
      });

      // Open download link
      window.open(resource.file_url, '_blank');
    } catch (error) {
      console.error('Error downloading resource:', error);
      alert('שגיאה בהורדת המשאב');
    }
  }

  const categories = ['all', ...new Set(resources.map(r => r.category).filter(Boolean))];
  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter(r => r.category === selectedCategory);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  const userIsPremium = isPremiumUser();

  return (
    <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">משאבים</h1>
          <p className="text-sm sm:text-base text-gray-600">גישה למשאבים וקבצים בלעדיים למשתמשי פרימיום</p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                  selectedCategory === category
                    ? 'bg-hot-pink text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {category === 'all' ? 'הכל' : category}
              </button>
            ))}
          </div>
        )}

        {/* Premium Access Message for Non-Premium Users */}
        {!userIsPremium && (
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-[#F52F8E] rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-[#F52F8E]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                  רק משתמשי פרימיום יכולים לצפות בתוכן זה
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  שדרג את המנוי שלך כדי לקבל גישה למשאבים בלעדיים, תוכן מתקדם ועוד הרבה יותר.
                </p>
                <Link
                  href="/subscription"
                  className="btn-primary inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 font-medium text-sm sm:text-base"
                >
                  <span>שדרג את המנוי כאן</span>
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">אין משאבים זמינים כרגע</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all ${
                  userIsPremium ? 'hover:shadow-md hover:border-[#F52F8E]' : 'opacity-75'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg flex items-center justify-center text-[#F52F8E]">
                    {getFileIcon(resource.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">
                      {resource.title}
                    </h3>
                    {resource.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {resource.description}
                      </p>
                    )}
                    {resource.category && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {resource.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{formatFileSize(resource.file_size)}</span>
                  <span>{resource.download_count || 0} הורדות</span>
                </div>

                {userIsPremium ? (
                  <button
                    onClick={() => handleDownload(resource)}
                    className="btn-primary w-full flex items-center justify-center gap-2 px-4 py-2 font-medium"
                  >
                    <Download className="w-5 h-5" />
                    <span>הורד</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
                    <Lock className="w-5 h-5" />
                    <span>נדרש מנוי פרימיום</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


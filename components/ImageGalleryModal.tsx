'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ImageItem {
  name: string;
  bucket: string;
  publicUrl: string;
  created_at?: string;
  path: string;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  isAdmin: boolean;
}

const BUCKETS = [
  { id: 'all', name: 'כל התמונות', displayName: 'כל התמונות' },
  { id: 'avatars', name: 'avatars', displayName: 'תמונות פרופיל' },
  { id: 'course-thumbnails', name: 'course-thumbnails', displayName: 'תמונות קורסים' },
  { id: 'forum-posts', name: 'forum-posts', displayName: 'תמונות פורום' },
  { id: 'resources', name: 'resources', displayName: 'תמונות משאבים' },
  { id: 'recordings', name: 'recordings', displayName: 'תמונות הקלטות' },
  { id: 'thumbnails', name: 'thumbnails', displayName: 'תמונות ממוזערות' },
];

export default function ImageGalleryModal({ isOpen, onClose, onSelect, isAdmin }: ImageGalleryModalProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    } else {
      // Reset state when modal closes
      setImages([]);
      setSearchQuery('');
      setSelectedBucket('all');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadImages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allImages: ImageItem[] = [];
      const bucketsToLoad = selectedBucket === 'all' 
        ? BUCKETS.filter(b => b.id !== 'all').map(b => b.name)
        : [selectedBucket];

      // Helper function to list files in a folder
      const listFilesInFolder = async (bucketName: string, folderPath: string = ''): Promise<ImageItem[]> => {
        const images: ImageItem[] = [];
        
        try {
          const { data, error: listError } = await supabase.storage
            .from(bucketName)
            .list(folderPath, {
              limit: 1000,
              offset: 0,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (listError) {
            // If folder doesn't exist, that's okay - just return empty array
            if (listError.message?.includes('not found') || listError.message?.includes('No such')) {
              return images;
            }
            console.warn(`Error loading from ${bucketName}/${folderPath}:`, listError);
            return images;
          }

          if (!data) return images;

          for (const item of data) {
            // Check if it's an image file
            const ext = item.name.split('.').pop()?.toLowerCase();
            if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
              const filePath = folderPath ? `${folderPath}/${item.name}` : item.name;
              const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

              images.push({
                name: item.name,
                bucket: bucketName,
                publicUrl,
                created_at: item.created_at,
                path: filePath,
              });
            }
          }
        } catch (err) {
          console.warn(`Error processing ${bucketName}/${folderPath}:`, err);
        }
        
        return images;
      };

      for (const bucketName of bucketsToLoad) {
        try {
          // Try root folder first
          const rootImages = await listFilesInFolder(bucketName, '');
          allImages.push(...rootImages);
          
          // Try common subfolders based on bucket name
          const commonFolders: Record<string, string[]> = {
            'avatars': ['avatars'],
            'course-thumbnails': ['course-thumbnails'],
            'forum-posts': ['forum-posts'],
            'resources': ['resources'],
            'recordings': ['recordings'],
            'thumbnails': ['thumbnails'],
          };
          
          const foldersToCheck = commonFolders[bucketName] || [];
          for (const folder of foldersToCheck) {
            const folderImages = await listFilesInFolder(bucketName, folder);
            allImages.push(...folderImages);
          }
        } catch (err) {
          console.warn(`Error processing bucket ${bucketName}:`, err);
          continue;
        }
      }

      // Sort by created_at descending
      allImages.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setImages(allImages);
    } catch (err: any) {
      console.error('Error loading images:', err);
      setError('שגיאה בטעינת התמונות. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedBucket) {
      loadImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBucket]);

  const filteredImages = useMemo(() => {
    if (!searchQuery) return images;
    const query = searchQuery.toLowerCase();
    return images.filter(img => 
      img.name.toLowerCase().includes(query) ||
      img.bucket.toLowerCase().includes(query)
    );
  }, [images, searchQuery]);

  const handleDelete = async (image: ImageItem) => {
    if (!isAdmin) {
      alert('אין לך הרשאה למחוק תמונות');
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק את התמונה "${image.name}"?`)) {
      return;
    }

    setDeletingImage(image.path);
    try {
      const { error: deleteError } = await supabase.storage
        .from(image.bucket)
        .remove([image.path]);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setImages(prev => prev.filter(img => img.path !== image.path || img.bucket !== image.bucket));
      
      alert('התמונה נמחקה בהצלחה');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      alert('שגיאה במחיקת התמונה: ' + (err.message || 'שגיאה לא ידועה'));
    } finally {
      setDeletingImage(null);
    }
  };

  const handleSelect = (image: ImageItem) => {
    onSelect(image.publicUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">גלריה תמונות</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map(bucket => (
              <button
                key={bucket.id}
                onClick={() => setSelectedBucket(bucket.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedBucket === bucket.id
                    ? 'bg-[#F52F8E] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {bucket.displayName}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="חפש תמונה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
              dir="rtl"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#F52F8E]" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>לא נמצאו תמונות</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <div
                  key={`${image.bucket}-${image.path}-${index}`}
                  className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-square hover:shadow-lg transition-shadow"
                >
                  <img
                    src={image.publicUrl}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleSelect(image)}
                      className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                    >
                      בחר
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(image)}
                        disabled={deletingImage === image.path}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {deletingImage === image.path ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate" dir="ltr">
                      {image.name}
                    </p>
                    <p className="text-white text-xs opacity-75">
                      {BUCKETS.find(b => b.name === image.bucket)?.displayName || image.bucket}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {filteredImages.length} תמונות
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}


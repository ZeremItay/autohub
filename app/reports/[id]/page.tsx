'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Eye, Calendar, Share2, Copy, Check, Facebook, Twitter, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { getReportById, type Report } from '@/lib/queries/reports';
import { formatTimeAgo } from '@/lib/utils/date';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  async function loadReport() {
    setLoading(true);
    try {
      const { data, error } = await getReportById(reportId);
      if (!error && data) {
        setReport(data);
      } else {
        console.error('Error loading report:', error);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">טוען דיווח...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">דיווח לא נמצא</p>
              <Link 
                href="/"
                className="mt-4 inline-flex items-center gap-2 text-[#F52F8E] hover:text-[#E01E7A] transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה לדף הראשי
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function handleShare(type: 'link' | 'whatsapp' | 'facebook' | 'twitter') {
    if (!report) return;

    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = report.title;
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

  // Helper function to clean placeholder images from HTML content
  function cleanPlaceholderImages(content: string): string {
    if (!content || typeof content !== 'string') {
      return content;
    }
    
    // Pattern to match base64 SVG images with "טוען..." (loading placeholder)
    const placeholderPattern = /<img[^>]*src=["']data:image\/svg\+xml;base64,[^"']*טוען[^"']*["'][^>]*>/gi;
    
    // Remove placeholder images
    let cleanedContent = content.replace(placeholderPattern, '');
    
    // Also check for the specific loading SVG pattern
    const loadingSvgPattern = /<img[^>]*src=["']data:image\/svg\+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5טוען[^"']*["'][^>]*>/gi;
    cleanedContent = cleanedContent.replace(loadingSvgPattern, '');
    
    return cleanedContent;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#F52F8E] transition-colors mb-6"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לדף הראשי
          </Link>

          {/* Report Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex-1">{report.title}</h1>
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-[#F52F8E]"
                    title="שתף"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  
                  {showShareMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowShareMenu(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 min-w-[180px]">
                        <button
                          onClick={() => handleShare('link')}
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
                          onClick={() => handleShare('whatsapp')}
                          className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center justify-between gap-2 text-sm text-gray-700"
                        >
                          <span>WhatsApp</span>
                          <MessageCircle className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                          onClick={() => handleShare('facebook')}
                          className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center justify-between gap-2 text-sm text-gray-700"
                        >
                          <span>Facebook</span>
                          <Facebook className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleShare('twitter')}
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
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatTimeAgo(report.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{report.views} צפיות</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div 
              className="text-gray-700 leading-relaxed prose prose-sm max-w-none prose-img:max-w-full prose-img:rounded-lg prose-img:my-4"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: cleanPlaceholderImages(report.content) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


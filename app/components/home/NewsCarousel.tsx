'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type News } from '@/lib/queries/news';

interface NewsCarouselProps {
  news: News[];
}

export function NewsCarousel({ news }: NewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!news || !Array.isArray(news) || news.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === news.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [news]);

  if (!news || news.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 relative overflow-hidden">
      <div className="relative">
        <div className="relative h-48 sm:h-64 overflow-hidden rounded-lg">
          {news.map((item, index) => (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {item.link_url ? (
                <Link href={item.link_url} className="block h-full">
                  <div className="relative h-full bg-gradient-to-br from-[#F52F8E] to-pink-500 rounded-lg overflow-hidden">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end">
                      <div className="p-4 sm:p-6 text-white w-full">
                        <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                        {item.content && (
                          <p className="text-sm sm:text-base opacity-90 line-clamp-2">{item.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="relative h-full bg-gradient-to-br from-[#F52F8E] to-pink-500 rounded-lg overflow-hidden">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end">
                    <div className="p-4 sm:p-6 text-white w-full">
                      <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                      {item.content && (
                        <p className="text-sm sm:text-base opacity-90 line-clamp-2">{item.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {news.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev === 0 ? news.length - 1 : prev - 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all z-10"
              aria-label="חדשה קודמת"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev === news.length - 1 ? 0 : prev + 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all z-10"
              aria-label="חדשה הבאה"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}

        {news.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {news.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-[#F52F8E] w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`עבור לחדשה ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


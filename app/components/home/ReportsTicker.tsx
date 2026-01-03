'use client';

import Link from 'next/link';
import { type Report } from '@/lib/queries/reports';
import { useState, useRef, useEffect } from 'react';

interface ReportsTickerProps {
  reports: Report[];
}

function formatTimeFromDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
}

export function ReportsTicker({ reports }: ReportsTickerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Reverse reports to show oldest first (since reports come in descending order)
  const displayReports = [...reports].reverse();

  // Calculate animation duration based on number of reports (slower = more time per report)
  // Base: 60 seconds for smooth scrolling, add 5 seconds per report
  const animationDuration = displayReports.length > 0 ? 60 + (displayReports.length * 5) : 60;

  useEffect(() => {
    // Reset animation when reports change to ensure it starts from the beginning
    if (marqueeRef.current && displayReports.length > 0) {
      const wrapper = marqueeRef.current;
      // Stop animation
      wrapper.style.animation = 'none';
      // Reset transform to start position (0%)
      wrapper.style.transform = 'translateX(0)';
      // Remove any inline styles that might interfere
      wrapper.style.left = '0';
      wrapper.style.right = 'auto';
      // Force reflow to apply changes
      void wrapper.offsetHeight;
      // Small delay to ensure reset is applied
      setTimeout(() => {
        // Restart animation with fresh start
        wrapper.style.animation = '';
      }, 10);
    }
  }, [displayReports.length]);

  // Also reset on mount to ensure it starts from beginning
  useEffect(() => {
    if (marqueeRef.current && displayReports.length > 0) {
      const wrapper = marqueeRef.current;
      // Ensure starting position is 0
      wrapper.style.transform = 'translateX(0)';
      wrapper.style.animationDelay = '0s';
      wrapper.style.animation = 'none';
      // Force reflow
      void wrapper.offsetHeight;
      // Restart after a brief moment
      setTimeout(() => {
        wrapper.style.animation = '';
      }, 50);
    }
  }, []);

  if (displayReports.length === 0) {
    return (
      <div className="max-w-7xl mx-auto mb-6">
        <div className="w-full bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden h-12 flex items-center relative">
          <div className="absolute right-0 z-10 h-full flex items-center pr-4">
            <div className="bg-gradient-to-l from-white via-white to-transparent w-24 h-full absolute right-0"></div>
            <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full relative z-10">
              דיווחים
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative pr-32">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-800">אין דיווחים חדשים</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee ${animationDuration}s linear infinite;
          display: flex;
          will-change: transform;
        }
        .animate-marquee.paused {
          animation-play-state: paused;
        }
      `}} />
      <div className="max-w-7xl mx-auto mb-6">
        <div className="w-full bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden h-12 flex items-center relative">
          <div className="absolute right-0 z-10 h-full flex items-center pr-4">
            <div className="bg-gradient-to-l from-white via-white to-transparent w-24 h-full absolute right-0"></div>
            <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full relative z-10">
              דיווחים
            </div>
          </div>
          
          <div 
            className="flex-1 overflow-hidden relative pr-32"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            ref={containerRef}
          >
            <div className="flex flex-row overflow-hidden relative" style={{ justifyContent: 'flex-start', direction: 'ltr' }}>
              <div 
                ref={marqueeRef}
                className={`flex shrink-0 items-center gap-4 animate-marquee whitespace-nowrap ${isPaused ? 'paused' : ''}`}
                style={{ 
                  willChange: 'transform',
                  direction: 'rtl'
                }}
              >
                {/* Set 1 - All reports (starts from beginning) */}
                {displayReports.map((report, index) => (
                  <span key={`report-1-${index}-${report.id}`} className="inline-flex items-center">
                    {index > 0 && <span className="text-gray-800 mx-2">•</span>}
                    <Link
                      href={`/reports/${report.id}`}
                      dir="rtl"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-red-600 transition-colors whitespace-nowrap px-4"
                    >
                      <span className="text-red-600 font-medium text-xs">
                        {report.created_at ? formatTimeFromDate(report.created_at) : ''}
                      </span>
                      <span className="text-gray-800">{report.title}</span>
                    </Link>
                    <span className="text-red-400 mx-4">|</span>
                  </span>
                ))}
                {/* Set 2 - Duplicate for seamless loop */}
                {displayReports.map((report, index) => (
                  <span key={`report-2-${index}-${report.id}`} className="inline-flex items-center">
                    {index > 0 && <span className="text-gray-800 mx-2">•</span>}
                    <Link
                      href={`/reports/${report.id}`}
                      dir="rtl"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-red-600 transition-colors whitespace-nowrap px-4"
                    >
                      <span className="text-red-600 font-medium text-xs">
                        {report.created_at ? formatTimeFromDate(report.created_at) : ''}
                      </span>
                      <span className="text-gray-800">{report.title}</span>
                    </Link>
                    <span className="text-red-400 mx-4">|</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


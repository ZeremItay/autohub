'use client';

import { useState, useEffect } from 'react';
import { Accessibility, X, Type, Eye, Link as LinkIcon, FileText } from 'lucide-react';

interface AccessibilityPreferences {
  textSize: 'normal' | 'level1' | 'level2';
  grayscale: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
}

const defaultPreferences: AccessibilityPreferences = {
  textSize: 'normal',
  grayscale: false,
  highlightLinks: false,
  readableFont: false,
};

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);

  // Apply preferences to the document - Defined before useEffect to avoid reference errors
  const applyPreferences = (prefs: AccessibilityPreferences) => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    // Text Size
    html.classList.remove('text-size-level1', 'text-size-level2');
    if (prefs.textSize === 'level1') {
      html.classList.add('text-size-level1');
    } else if (prefs.textSize === 'level2') {
      html.classList.add('text-size-level2');
    }

    // Grayscale / High Contrast
    if (prefs.grayscale) {
      html.style.filter = 'grayscale(100%) contrast(120%)';
    } else {
      html.style.filter = '';
    }

    // Highlight Links
    if (prefs.highlightLinks) {
      body.classList.add('highlight-links');
    } else {
      body.classList.remove('highlight-links');
    }

    // Readable Font
    if (prefs.readableFont) {
      body.classList.add('readable-font');
    } else {
      body.classList.remove('readable-font');
    }
  };

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-preferences');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPreferences({ ...defaultPreferences, ...parsed });
          applyPreferences({ ...defaultPreferences, ...parsed });
        } catch (error) {
          console.error('Error loading accessibility preferences:', error);
        }
      }
    }
  }, []);

  // Handle keyboard navigation (ESC to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  // Save preferences to localStorage
  const savePreferences = (newPrefs: AccessibilityPreferences) => {
    setPreferences(newPrefs);
    applyPreferences(newPrefs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-preferences', JSON.stringify(newPrefs));
    }
  };

  // Toggle text size
  const toggleTextSize = () => {
    const nextSize = 
      preferences.textSize === 'normal' ? 'level1' :
      preferences.textSize === 'level1' ? 'level2' :
      'normal';
    savePreferences({ ...preferences, textSize: nextSize });
  };

  // Toggle grayscale
  const toggleGrayscale = () => {
    savePreferences({ ...preferences, grayscale: !preferences.grayscale });
  };

  // Toggle highlight links
  const toggleHighlightLinks = () => {
    savePreferences({ ...preferences, highlightLinks: !preferences.highlightLinks });
  };

  // Toggle readable font
  const toggleReadableFont = () => {
    savePreferences({ ...preferences, readableFont: !preferences.readableFont });
  };

  // Reset all preferences
  const resetAll = () => {
    savePreferences(defaultPreferences);
  };

  const getTextSizeLabel = () => {
    switch (preferences.textSize) {
      case 'level1': return 'גודל טקסט - רמה 1';
      case 'level2': return 'גודל טקסט - רמה 2';
      default: return 'גודל טקסט - רגיל';
    }
  };

  return (
    <>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[100] w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:outline-none mb-2"
        aria-label="פתח תפריט נגישות"
        aria-expanded={isOpen}
        aria-controls="accessibility-menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Accessibility className="w-6 h-6" aria-hidden="true" />
        )}
      </button>

      {/* Accessibility Menu */}
      {isOpen && (
        <div
          id="accessibility-menu"
          className="fixed bottom-20 left-4 sm:bottom-24 sm:left-6 z-[100] w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] overflow-y-auto glass-card rounded-2xl shadow-2xl p-6 border-2 border-white/30"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accessibility-menu-title"
        >
          <h2
            id="accessibility-menu-title"
            className="text-xl font-bold text-white mb-4 pb-3 border-b border-white/20"
          >
            אפשרויות נגישות
          </h2>

          <div className="space-y-3">
            {/* Text Size Toggle */}
            <button
              onClick={toggleTextSize}
              className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
              aria-label={`${getTextSizeLabel()}. לחץ לשינוי`}
            >
              <div className="flex items-center gap-3">
                <Type className="w-5 h-5 text-blue-400" aria-hidden="true" />
                <span className="font-semibold">{getTextSizeLabel()}</span>
              </div>
              <span className="text-sm text-gray-300">
                {preferences.textSize === 'normal' ? 'רגיל' :
                 preferences.textSize === 'level1' ? 'רמה 1' : 'רמה 2'}
              </span>
            </button>

            {/* Grayscale / High Contrast Toggle */}
            <button
              onClick={toggleGrayscale}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
                preferences.grayscale
                  ? 'bg-blue-500/30 hover:bg-blue-500/40'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              aria-label={`${preferences.grayscale ? 'כבוי' : 'הפעל'} ניגודיות גבוהה`}
              aria-pressed={preferences.grayscale}
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-blue-400" aria-hidden="true" />
                <span className="font-semibold">ניגודיות גבוהה</span>
              </div>
              <span className={`text-sm ${preferences.grayscale ? 'text-blue-300' : 'text-gray-300'}`}>
                {preferences.grayscale ? 'מופעל' : 'כבוי'}
              </span>
            </button>

            {/* Highlight Links Toggle */}
            <button
              onClick={toggleHighlightLinks}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
                preferences.highlightLinks
                  ? 'bg-yellow-500/30 hover:bg-yellow-500/40'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              aria-label={`${preferences.highlightLinks ? 'כבוי' : 'הפעל'} הדגשת קישורים`}
              aria-pressed={preferences.highlightLinks}
            >
              <div className="flex items-center gap-3">
                <LinkIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                <span className="font-semibold">הדגשת קישורים</span>
              </div>
              <span className={`text-sm ${preferences.highlightLinks ? 'text-yellow-300' : 'text-gray-300'}`}>
                {preferences.highlightLinks ? 'מופעל' : 'כבוי'}
              </span>
            </button>

            {/* Readable Font Toggle */}
            <button
              onClick={toggleReadableFont}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
                preferences.readableFont
                  ? 'bg-green-500/30 hover:bg-green-500/40'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              aria-label={`${preferences.readableFont ? 'כבוי' : 'הפעל'} גופן קריא`}
              aria-pressed={preferences.readableFont}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-400" aria-hidden="true" />
                <span className="font-semibold">גופן קריא</span>
              </div>
              <span className={`text-sm ${preferences.readableFont ? 'text-green-300' : 'text-gray-300'}`}>
                {preferences.readableFont ? 'מופעל' : 'כבוי'}
              </span>
            </button>

            {/* Reset Button */}
            <button
              onClick={resetAll}
              className="w-full mt-4 p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors text-white font-semibold focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
              aria-label="איפוס כל ההגדרות"
            >
              איפוס כל ההגדרות
            </button>

            {/* Link to Accessibility Statement */}
            <a
              href="/accessibility"
              className="block mt-4 text-center text-sm text-blue-300 hover:text-blue-200 underline focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none rounded"
              aria-label="קרא את הצהרת הנגישות"
            >
              הצהרת נגישות
            </a>
          </div>
        </div>
      )}

      {/* Backdrop to close menu when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}


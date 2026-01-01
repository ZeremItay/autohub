'use client';

import { Star, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface KeyPoint {
  title: string;
  description: string;
  url?: string;
}

interface KeyPointsEditorProps {
  keyPoints: KeyPoint[];
  onChange: (keyPoints: KeyPoint[]) => void;
  className?: string;
}

export default function KeyPointsEditor({ keyPoints, onChange, className = '' }: KeyPointsEditorProps) {
  const handleAddPoint = () => {
    onChange([...(keyPoints || []), { title: '', description: '', url: '' }]);
  };

  const handleRemovePoint = (index: number) => {
    const updated = [...(keyPoints || [])];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleUpdatePoint = (index: number, field: 'title' | 'description' | 'url', value: string) => {
    const updated = [...(keyPoints || [])];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...(keyPoints || [])];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= (keyPoints || []).length - 1) return;
    const updated = [...(keyPoints || [])];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  return (
    <div className={`mt-6 pt-6 border-t border-white/20 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-500" />
        נקודות חשובות
      </h3>
      <div className="space-y-4">
        {(keyPoints || []).map((point, index) => (
          <div key={index} className="p-4 glass-card border border-white/20 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-yellow-400">נקודה {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed p-1"
                  aria-label="הזז למעלה"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= (keyPoints || []).length - 1}
                  className="text-gray-400 hover:text-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed p-1"
                  aria-label="הזז למטה"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemovePoint(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  aria-label="מחק"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="כותרת הנקודה"
              value={point.title || ''}
              onChange={(e) => handleUpdatePoint(index, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white rounded-lg mb-2"
              dir="rtl"
              lang="he"
            />
            <textarea
              placeholder="תיאור הנקודה (טקסט שיוצג כקישור אם יש URL)"
              value={point.description || ''}
              onChange={(e) => handleUpdatePoint(index, 'description', e.target.value)}
              dir="rtl"
              lang="he"
              className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white rounded-lg mb-2"
              rows={3}
            />
            <input
              type="url"
              placeholder="קישור (URL) - אופציונלי"
              value={point.url || ''}
              onChange={(e) => handleUpdatePoint(index, 'url', e.target.value)}
              className="w-full px-3 py-2 border border-white/20 bg-white/5 text-white rounded-lg"
            />
            {point.url && (
              <p className="text-xs text-gray-400 mt-1">
                💡 אם יש קישור, הטקסט בתיאור יוצג כקישור לחיצה
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddPoint}
          className="w-full px-4 py-2 border-2 border-dashed border-yellow-500/50 text-yellow-400 rounded-lg hover:bg-yellow-500/10 transition-colors"
        >
          + הוסף נקודה חשובה
        </button>
      </div>
    </div>
  );
}


'use client';

import { HelpCircle, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface QAItem {
  question: string;
  answer: string;
}

interface QASectionEditorProps {
  qaSection: QAItem[];
  onChange: (qaSection: QAItem[]) => void;
  className?: string;
}

export default function QASectionEditor({ qaSection, onChange, className = '' }: QASectionEditorProps) {
  const handleAddQA = () => {
    onChange([...(qaSection || []), { question: '', answer: '' }]);
  };

  const handleRemoveQA = (index: number) => {
    const updated = [...(qaSection || [])];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleUpdateQA = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...(qaSection || [])];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...(qaSection || [])];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= (qaSection || []).length - 1) return;
    const updated = [...(qaSection || [])];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  return (
    <div className={`mt-6 pt-6 border-t border-gray-300 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-blue-500" />
        שאלות ותשובות
      </h3>
      <div className="space-y-4">
        {(qaSection || []).map((qa, index) => (
          <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-blue-700">שאלה {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed p-1"
                  aria-label="הזז למעלה"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= (qaSection || []).length - 1}
                  className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed p-1"
                  aria-label="הזז למטה"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveQA(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  aria-label="מחק"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="שאלה"
              value={qa.question || ''}
              onChange={(e) => handleUpdateQA(index, 'question', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
              dir="rtl"
              lang="he"
            />
            <textarea
              placeholder="תשובה"
              value={qa.answer || ''}
              onChange={(e) => handleUpdateQA(index, 'answer', e.target.value)}
              dir="rtl"
              lang="he"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddQA}
          className="w-full px-4 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          + הוסף שאלה ותשובה
        </button>
      </div>
    </div>
  );
}


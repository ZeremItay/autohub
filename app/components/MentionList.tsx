'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface User {
  id: string;
  label: string;
  username: string;
  avatar_url?: string;
}

interface MentionListProps {
  items: User[];
  command: (item: User) => void;
}

/**
 * MentionList Component
 *
 * Dropdown list for @ mention autocomplete suggestions
 * Features:
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Click to select
 * - User avatars and names
 * - RTL support for Hebrew
 */
export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" dir="rtl">
        <div className="text-sm text-gray-500 text-center">לא נמצאו משתמשים</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto" dir="rtl">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => selectItem(index)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-right transition-colors ${
            index === selectedIndex ? 'bg-pink-50' : 'hover:bg-gray-50'
          }`}
        >
          {item.avatar_url ? (
            <img
              src={item.avatar_url}
              alt={item.label}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {item.label.charAt(0)}
            </div>
          )}
          <div className="flex-1 text-right">
            <div className="font-medium text-gray-900 text-sm">{item.label}</div>
            {item.username && item.username !== item.label && (
              <div className="text-xs text-gray-500">@{item.username}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';

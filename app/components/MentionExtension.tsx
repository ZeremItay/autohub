import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList } from './MentionList';

let debounceTimer: NodeJS.Timeout;

/**
 * Create TipTap Mention Extension
 *
 * Provides @ mention autocomplete functionality with:
 * - Debounced user search (300ms)
 * - Dropdown positioning with Tippy.js
 * - Keyboard navigation support
 * - Custom mention rendering with pink highlight
 */
export const createMentionExtension = () => {
  return Mention.configure({
    HTMLAttributes: {
      class: 'mention',
    },
    renderLabel({ node }) {
      return `@${node.attrs.label || node.attrs.id}`;
    },
    renderHTML({ options, node }) {
      const userId = node.attrs.id;
      const label = node.attrs.label || node.attrs.id;
      return [
        'a',
        {
          ...options.HTMLAttributes,
          href: `/profile?userId=${userId}`,
          'data-user-id': userId,
        },
        `@${label}`,
      ];
    },
    suggestion: {
      items: async ({ query }: { query: string }) => {
        // Debounce API calls to reduce server load
        return new Promise((resolve) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            try {
              // Always fetch users, even for empty query
              const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
              const data = await response.json();
              console.log(`[Mention] Query: "${query}", Found: ${data.users?.length || 0} users`);

              if (data.users && data.users.length > 0) {
                console.log('[Mention] First user:', data.users[0]);
              }

              resolve(data.users || []);
            } catch (error) {
              console.error('[Mention] Error fetching users:', error);
              resolve([]);
            }
          }, 300); // 300ms debounce delay
        });
      },

      render: () => {
        let component: ReactRenderer | undefined;
        let popup: TippyInstance[] | undefined;

        return {
          onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });

            if (!props.clientRect) {
              return;
            }

            popup = tippy('body', {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              maxWidth: 'none',
            });
          },

          onUpdate(props: any) {
            if (!component) {
              return;
            }

            component.updateProps(props);

            if (!props.clientRect || !popup || !popup[0]) {
              return;
            }

            popup[0].setProps({
              getReferenceClientRect: props.clientRect,
            });
          },

          onKeyDown(props: any) {
            if (props.event.key === 'Escape') {
              if (popup && popup[0]) {
                popup[0].hide();
              }
              return true;
            }

            if (!component) {
              return false;
            }

            // @ts-ignore - component.ref has onKeyDown but types don't recognize it
            return component.ref?.onKeyDown?.(props) || false;
          },

          onExit() {
            if (popup && popup[0]) {
              popup[0].destroy();
            }
            if (component) {
              component.destroy();
            }
          },
        };
      },
    },
  });
};

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { createMentionExtension } from './MentionExtension';
import { supabase } from '@/lib/supabase';
import { Bold, Italic, Link as LinkIcon, Image as ImageIcon, List, ListOrdered } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  userId?: string;
}

export default function RichTextEditor({ content, onChange, placeholder = 'תאר את הבעיה שלך או שתף ידע...', userId }: RichTextEditorProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc',
            dir: 'rtl',
            style: 'padding-right: 1.5rem; margin: 0.5rem 0;',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal',
            dir: 'rtl',
            style: 'padding-right: 1.5rem; margin: 0.5rem 0;',
          },
        },
        listItem: {
          HTMLAttributes: {
            style: 'margin-bottom: 0.25rem;',
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4 cursor-pointer',
          style: 'max-width: 100%; height: auto;',
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: null,
              parseHTML: element => element.getAttribute('width'),
              renderHTML: attributes => {
                if (!attributes.width) {
                  return {};
                }
                return {
                  width: attributes.width,
                };
              },
            },
            height: {
              default: null,
              parseHTML: element => element.getAttribute('height'),
              renderHTML: attributes => {
                if (!attributes.height) {
                  return {};
                }
                return {
                  height: attributes.height,
                };
              },
            },
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) {
                  return {};
                }
                return {
                  style: attributes.style,
                };
              },
            },
          };
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'right',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#F52F8E] underline',
        },
      }),
      createMentionExtension(),
    ],
    content,
      editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-right prose-headings:text-right prose-p:text-right prose-ul:text-right prose-ol:text-right prose-li:text-right prose-li:list-item prose-ul:list-disc prose-ol:list-decimal prose-img:max-w-full prose-img:rounded-lg prose-img:my-4 [&_ul]:pr-6 [&_ol]:pr-6 [&_li]:mb-1',
        dir: 'rtl',
        style: 'direction: rtl; text-align: right;',
      },
      transformPastedHTML(html) {
        // Remove ProseMirror separators
        return html.replace(/<img[^>]*class="[^"]*ProseMirror-separator[^"]*"[^>]*>/gi, '');
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleImageUpload(file);
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    immediatelyRender: false, // Fix SSR warning
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      // Only update if content actually changed to avoid unnecessary updates
      if (currentContent !== content) {
        editor.commands.setContent(content || '');
      }
    }
  }, [editor, content]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor || !userId) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('גודל הקובץ גדול מדי. מקסימום 5MB');
      return;
    }

    // Show base64 preview immediately
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Preview = reader.result as string;
      
      // Insert base64 preview immediately
      editor.chain().focus().setImage({ src: base64Preview }).run();
      
      // Set style after insertion
      setTimeout(() => {
        let imageNodePos: number | null = null;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === base64Preview) {
            imageNodePos = pos;
            return false;
          }
        });
        
        if (imageNodePos !== null) {
          const tr = editor.state.tr;
          const imageNode = editor.state.doc.nodeAt(imageNodePos);
          if (imageNode) {
            tr.setNodeMarkup(imageNodePos, undefined, {
              ...imageNode.attrs,
              style: 'max-width: 100%; height: auto;'
            });
            editor.view.dispatch(tr);
          }
        }
      }, 0);

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `forum-post-${userId}-${Date.now()}.${fileExt}`;
        const filePath = `forum-posts/${fileName}`;

        // Try to upload to Supabase Storage
        let imageUrl: string;

        try {
          const { error: uploadError } = await supabase.storage
            .from('forum-posts')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            // If bucket doesn't exist, try 'avatars' bucket as fallback
            const { error: uploadError2 } = await supabase.storage
              .from('avatars')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadError2) {
              // Keep base64 - already inserted
              return;
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
              imageUrl = publicUrl;
            }
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('forum-posts')
              .getPublicUrl(filePath);
            imageUrl = publicUrl;
          }
        } catch (error) {
          // Keep base64 - already inserted
          console.warn('Error uploading to storage, keeping base64:', error);
          return;
        }

        // Find and replace the preview image with actual URL
        let imageNodePos: number | null = null;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === base64Preview) {
            imageNodePos = pos;
            return false; // Stop searching
          }
        });

        if (imageNodePos !== null) {
          // Replace the preview image with actual URL, preserving size
          const tr = editor.state.tr;
          const imageNode = editor.state.doc.nodeAt(imageNodePos);
          if (imageNode) {
            tr.setNodeMarkup(imageNodePos, undefined, {
              ...imageNode.attrs,
              src: imageUrl,
              width: imageNode.attrs.width || '100%',
              style: imageNode.attrs.style || 'max-width: 100%; height: auto;'
            });
            editor.view.dispatch(tr);
          }
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        // Keep base64 preview on error
      }
    };
    reader.readAsDataURL(file);
  }, [editor, userId]);

  const addImage = useCallback(() => {
    if (!editor) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  }, [editor, handleImageUpload]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#F52F8E] focus-within:border-transparent transition-all" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          }`}
          title="מודגש"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          }`}
          title="נטוי"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const existingUrl = editor.getAttributes('link')?.href || '';
            setLinkUrl(existingUrl);
            setIsLinkModalOpen(true);
          }}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-gray-300' : ''
          }`}
          title="קישור"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="הוסף תמונה"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          }`}
          title="רשימה עם נקודות"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          }`}
          title="רשימה ממוספרת"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        {(() => {
          // Check if selection is on an image
          const { from } = editor.state.selection;
          const node = editor.state.doc.nodeAt(from);
          const isImageSelected = node && node.type.name === 'image';
          
          if (!isImageSelected) return null;
          
          return (
            <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
              <button
                type="button"
                onClick={() => {
                  const { from } = editor.state.selection;
                  const node = editor.state.doc.nodeAt(from);
                  if (node && node.type.name === 'image') {
                    const currentStyle = node.attrs.style || '';
                    let newWidth = '100%';
                    
                    // Extract current width from style
                    const widthMatch = currentStyle.match(/width:\s*(\d+%)/);
                    if (widthMatch) {
                      const currentWidth = widthMatch[1];
                      if (currentWidth === '100%') {
                        newWidth = '50%';
                      } else if (currentWidth === '50%') {
                        newWidth = '30%';
                      } else {
                        newWidth = '100%';
                      }
                    } else {
                      // No width in style, start with 50%
                      newWidth = '50%';
                    }
                    
                    const tr = editor.state.tr;
                    tr.setNodeMarkup(from, undefined, {
                      ...node.attrs,
                      style: `max-width: ${newWidth}; width: ${newWidth}; height: auto;`
                    });
                    editor.view.dispatch(tr);
                  }
                }}
                className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors"
                title="שנה גודל תמונה (100% → 50% → 30% → 100%)"
              >
                גודל
              </button>
            </div>
          );
        })()}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 text-sm font-medium text-gray-800">הוסף קישור</div>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              dir="ltr"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              {editor?.isActive('link') && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setIsLinkModalOpen(false);
                    setLinkUrl('');
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  הסר קישור
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkUrl('');
                }}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmedUrl = linkUrl.trim();
                  if (trimmedUrl) {
                    editor.chain().focus().setLink({ href: trimmedUrl }).run();
                  }
                  setIsLinkModalOpen(false);
                  setLinkUrl('');
                }}
                className="rounded-lg bg-[#F52F8E] px-3 py-2 text-sm text-white hover:bg-[#e2287a]"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


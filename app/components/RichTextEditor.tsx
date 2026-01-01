'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { supabase } from '@/lib/supabase';
import { Bold, Italic, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useCallback } from 'react';
import { logError } from '@/lib/utils/errorHandler';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  userId?: string;
}

export default function RichTextEditor({ content, onChange, placeholder = 'תאר את הבעיה שלך או שתף ידע...', userId }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
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
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-right prose-headings:text-right prose-p:text-right prose-ul:text-right prose-ol:text-right prose-img:max-w-full prose-img:rounded-lg prose-img:my-4',
        dir: 'rtl',
        style: 'direction: rtl; text-align: right;',
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
  });

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
          logError(error, 'handleImageUpload:storage');
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
          // Replace the preview image with actual URL
          const tr = editor.state.tr;
          const imageNode = editor.state.doc.nodeAt(imageNodePos);
          if (imageNode) {
            tr.setNodeMarkup(imageNodePos, undefined, {
              ...imageNode.attrs,
              src: imageUrl
            });
            editor.view.dispatch(tr);
          }
        }
      } catch (error) {
        logError(error, 'handleImageUpload');
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
    <div className="border border-white/20 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-hot-pink focus-within:border-transparent transition-all bg-white/5" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-white/20 bg-white/10">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-white/20 transition-colors text-white ${
            editor.isActive('bold') ? 'bg-hot-pink/30 text-hot-pink-light' : ''
          }`}
          title="מודגש"
          aria-label="מודגש"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-white/20 transition-colors text-white ${
            editor.isActive('italic') ? 'bg-hot-pink/30 text-hot-pink-light' : ''
          }`}
          title="נטוי"
          aria-label="נטוי"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('הכנס קישור:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-2 rounded hover:bg-white/20 transition-colors text-white ${
            editor.isActive('link') ? 'bg-hot-pink/30 text-hot-pink-light' : ''
          }`}
          title="קישור"
          aria-label="קישור"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded hover:bg-white/20 transition-colors text-white"
          title="הוסף תמונה"
          aria-label="הוסף תמונה"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}


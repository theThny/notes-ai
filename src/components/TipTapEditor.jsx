import React, { useEffect, useReducer } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Image } from '@tiptap/extension-image';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import MoodboardExtension from '../extensions/MoodboardExtension';
import AIExtension from '../extensions/AIExtension';
import { Bold, Italic, List, ListTodo, Type } from 'lucide-react';

export const MenuBar = ({ editor }) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', forceUpdate);
    return () => editor.off('transaction', forceUpdate);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-toolbar" style={{ display: 'flex', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--bg-panel, var(--bg-color))' }}>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`icon-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
        style={{ color: editor.isActive('bold') ? 'var(--primary-color)' : 'var(--text-main)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
        title="Negrito"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`icon-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
        style={{ color: editor.isActive('italic') ? 'var(--primary-color)' : 'var(--text-main)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
        title="Itálico"
      >
        <Italic size={18} />
      </button>
      <div style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`icon-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
        style={{ color: editor.isActive('heading', { level: 2 }) ? 'var(--primary-color)' : 'var(--text-main)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
        title="Subtítulo"
      >
        <Type size={18} />
      </button>
      <div style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`icon-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
        style={{ color: editor.isActive('bulletList') ? 'var(--primary-color)' : 'var(--text-main)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
        title="Lista de Marcadores"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={`icon-btn ${editor.isActive('taskList') ? 'is-active' : ''}`}
        style={{ color: editor.isActive('taskList') ? 'var(--primary-color)' : 'var(--text-main)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
        title="Lista de Tarefas"
      >
        <ListTodo size={18} />
      </button>
    </div>
  );
};

export const TipTapEditor = ({ content, onChange, onInit }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Image.configure({ inline: true, allowBase64: true }),
      MoodboardExtension,
      AIExtension,
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      // Extração de texto puro
      const text = editor.getText();
      
      // Lógica de Parse do Título
      let firstLine = text.split('\n')[0].trim();
      let newTitle = "Nova Nota";
      
      if (firstLine) {
        // Remove timestamps como [04:27]
        firstLine = firstLine.replace(/\[\d{2}:\d{2}\]\s*/g, '');
        // Capitaliza a primeira letra
        if (firstLine.length > 0) {
          firstLine = firstLine.charAt(0).toUpperCase() + firstLine.slice(1);
        }
        newTitle = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : (firstLine || "Nova Nota");
      }

      onChange(editor.getHTML(), newTitle);
    },
  });

  useEffect(() => {
    if (editor && onInit) {
      onInit(editor);
    }
  }, [editor, onInit]);

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHTML = editor.getHTML();
      if (content !== currentHTML && !editor.isFocused) {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const colors = [
    { name: 'Amarelo', color: '#fef08a' },
    { name: 'Verde', color: '#bbf7d0' },
    { name: 'Azul', color: '#bfdbfe' },
    { name: 'Rosa', color: '#fbcfe8' },
    { name: 'Laranja', color: '#fed7aa' }
  ];

  return (
    <div className="tiptap-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
      {editor && (
        <BubbleMenu className="bubble-menu" tippyOptions={{ duration: 100 }} editor={editor} style={{ display: 'flex', backgroundColor: '#252525', padding: '6px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', border: '1px solid #333', gap: '8px', alignItems: 'center', zIndex: 50 }}>
          {colors.map(c => (
            <button
              key={c.name}
              onMouseDown={(e) => { 
                e.preventDefault(); 
                editor.commands.setHighlight({ color: c.color }); 
              }}
              className={editor.isActive('highlight', { color: c.color }) ? 'is-active' : ''}
              style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c.color, border: '1px solid rgba(0,0,0,0.2)', cursor: 'pointer' }}
              title={c.name}
            />
          ))}
          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />
          <button
             onMouseDown={(e) => { 
               e.preventDefault(); 
               editor.commands.unsetHighlight(); 
             }}
             style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            Limpar
          </button>
        </BubbleMenu>
      )}

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto', outline: 'none' }}>
        <EditorContent editor={editor} style={{ minHeight: '300px', outline: 'none' }} />
      </div>
    </div>
  );
};

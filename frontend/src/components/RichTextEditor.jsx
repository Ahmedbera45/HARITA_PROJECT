import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { Extension } from '@tiptap/core';
import {
  Box,
  IconButton,
  Divider,
  Select,
  MenuItem,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  CheckBox,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatColorText,
  Link as LinkIcon,
  Undo,
  Redo,
} from '@mui/icons-material';

// Custom font size extension (TextStyle'ı genişletir)
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize || null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const HEADING_OPTIONS = [
  { value: 'paragraph', label: 'Normal' },
  { value: '1', label: 'Başlık 1' },
  { value: '2', label: 'Başlık 2' },
  { value: '3', label: 'Başlık 3' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'İçerik girin...',
  minHeight = 200,
  readOnly = false,
}) {
  const colorInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: true }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content: content ?? '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Controlled update — dışarıdan content değişince editörü güncelle (loop'u önle)
  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      editor.commands.setContent(content ?? '', false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  if (!editor) return null;

  const getHeadingValue = () => {
    for (let level = 1; level <= 3; level++) {
      if (editor.isActive('heading', { level })) return String(level);
    }
    return 'paragraph';
  };

  const handleHeadingChange = (e) => {
    const val = e.target.value;
    if (val === 'paragraph') editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: parseInt(val) }).run();
  };

  const handleFontSizeChange = (e) => {
    editor.chain().focus().setFontSize(e.target.value).run();
  };

  const handleLinkClick = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Link URL:', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const btnColor = (active) => active ? 'primary' : 'default';

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 1,
        overflow: 'hidden',
        opacity: readOnly ? 0.8 : 1,
        '& .ProseMirror': {
          minHeight: `${minHeight}px`,
          padding: '12px 16px',
          outline: 'none',
          fontSize: '0.875rem',
          lineHeight: 1.7,
          '& p.is-editor-empty:first-of-type::before': {
            content: 'attr(data-placeholder)',
            color: 'text.disabled',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
          '& ul[data-type="taskList"]': {
            listStyle: 'none',
            padding: 0,
            '& li': {
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              '& > label': { marginTop: '2px' },
            },
          },
          '& h1': { fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 4px' },
          '& h2': { fontSize: '1.25rem', fontWeight: 600, margin: '8px 0 4px' },
          '& h3': { fontSize: '1.1rem', fontWeight: 600, margin: '8px 0 4px' },
          '& ul, & ol': { paddingLeft: '20px' },
          '& a': { color: 'primary.main', textDecoration: 'underline' },
          '& blockquote': {
            borderLeft: '3px solid #ccc',
            paddingLeft: '12px',
            color: 'text.secondary',
          },
          '& code': {
            backgroundColor: 'action.hover',
            borderRadius: '3px',
            padding: '1px 4px',
            fontFamily: 'monospace',
          },
        },
      }}
    >
      {/* Toolbar */}
      {!readOnly && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.25,
            alignItems: 'center',
            px: 1,
            py: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          {/* History */}
          <Tooltip title="Geri Al"><IconButton size="small" onClick={() => editor.chain().focus().undo().run()}><Undo fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="İleri Al"><IconButton size="small" onClick={() => editor.chain().focus().redo().run()}><Redo fontSize="small" /></IconButton></Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Format */}
          <Tooltip title="Kalın"><IconButton size="small" color={btnColor(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><FormatBold fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="İtalik"><IconButton size="small" color={btnColor(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><FormatItalic fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Altı Çizili"><IconButton size="small" color={btnColor(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()}><FormatUnderlined fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Üstü Çizili"><IconButton size="small" color={btnColor(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()}><StrikethroughS fontSize="small" /></IconButton></Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Heading */}
          <Select
            size="small"
            value={getHeadingValue()}
            onChange={handleHeadingChange}
            sx={{ height: 28, fontSize: '0.75rem', minWidth: 90 }}
          >
            {HEADING_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>
            ))}
          </Select>

          {/* Font Size */}
          <Select
            size="small"
            value={editor.getAttributes('textStyle').fontSize || '16px'}
            onChange={handleFontSizeChange}
            sx={{ height: 28, fontSize: '0.75rem', minWidth: 70, ml: 0.5 }}
          >
            {FONT_SIZES.map(s => (
              <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}>{s.replace('px', '')}</MenuItem>
            ))}
          </Select>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Renk */}
          <Tooltip title="Metin Rengi">
            <IconButton
              size="small"
              onClick={() => colorInputRef.current?.click()}
              color={btnColor(editor.isActive('textStyle'))}
            >
              <FormatColorText fontSize="small" />
              <input
                ref={colorInputRef}
                type="color"
                style={{ display: 'none' }}
                defaultValue="#000000"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Lists */}
          <Tooltip title="Madde İşareti"><IconButton size="small" color={btnColor(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}><FormatListBulleted fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Numaralı Liste"><IconButton size="small" color={btnColor(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><FormatListNumbered fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Görev Listesi"><IconButton size="small" color={btnColor(editor.isActive('taskList'))} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckBox fontSize="small" /></IconButton></Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Align */}
          <Tooltip title="Sola Hizala"><IconButton size="small" color={btnColor(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()}><FormatAlignLeft fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Ortala"><IconButton size="small" color={btnColor(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()}><FormatAlignCenter fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Sağa Hizala"><IconButton size="small" color={btnColor(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()}><FormatAlignRight fontSize="small" /></IconButton></Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Link */}
          <Tooltip title="Link Ekle"><IconButton size="small" color={btnColor(editor.isActive('link'))} onClick={handleLinkClick}><LinkIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      )}

      <EditorContent editor={editor} />
    </Paper>
  );
}

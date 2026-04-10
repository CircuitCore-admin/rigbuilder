import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Markdown from 'react-markdown';
import TurndownService from 'turndown';
import { marked } from 'marked';
import {
  BoldIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon, HeadingIcon,
  LinkIcon, ListBulletIcon, ListNumberedIcon, QuoteIcon, CodeIcon, CodeBlockIcon,
} from '../Icons/ForumIcons';
import styles from './MarkdownEditor.module.scss';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  required?: boolean;
  maxLength?: number;
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Ensure fenced code blocks use triple-backtick
turndown.addRule('fencedCodeBlock', {
  filter: (node) => node.nodeName === 'PRE' && !!node.querySelector('code'),
  replacement: (_content, node) => {
    const code = (node as HTMLElement).querySelector('code');
    return `\n\`\`\`\n${code?.textContent ?? ''}\n\`\`\`\n`;
  },
});

function markdownToHtml(md: string): string {
  if (!md.trim()) return '';
  return marked.parse(md, { async: false }) as string;
}

interface ToolbarButton {
  label: string;
  icon: React.ReactNode;
  action: string;
  shortcut?: string;
}

const TOOLBAR_BUTTONS: (ToolbarButton | 'sep')[] = [
  { label: 'Bold', icon: <BoldIcon size={15} />, action: 'bold', shortcut: 'Ctrl+B' },
  { label: 'Italic', icon: <ItalicIcon size={15} />, action: 'italic', shortcut: 'Ctrl+I' },
  { label: 'Strikethrough', icon: <StrikethroughIcon size={15} />, action: 'strike' },
  { label: 'Underline', icon: <UnderlineIcon size={15} />, action: 'underline', shortcut: 'Ctrl+U' },
  'sep',
  { label: 'Heading', icon: <HeadingIcon size={15} />, action: 'heading' },
  { label: 'Link', icon: <LinkIcon size={15} />, action: 'link', shortcut: 'Ctrl+K' },
  'sep',
  { label: 'Bullet List', icon: <ListBulletIcon size={15} />, action: 'bulletList' },
  { label: 'Numbered List', icon: <ListNumberedIcon size={15} />, action: 'orderedList' },
  { label: 'Blockquote', icon: <QuoteIcon size={15} />, action: 'blockquote' },
  'sep',
  { label: 'Inline Code', icon: <CodeIcon size={15} />, action: 'code' },
  { label: 'Code Block', icon: <CodeBlockIcon size={15} />, action: 'codeBlock' },
];

const SHORTCUT_HELP = [
  { keys: 'Ctrl+B', desc: 'Bold' },
  { keys: 'Ctrl+I', desc: 'Italic' },
  { keys: 'Ctrl+U', desc: 'Underline' },
  { keys: 'Ctrl+K', desc: 'Insert link' },
  { keys: 'Ctrl+Shift+X', desc: 'Strikethrough' },
  { keys: 'Ctrl+Shift+7', desc: 'Numbered list' },
  { keys: 'Ctrl+Shift+8', desc: 'Bullet list' },
  { keys: 'Ctrl+Shift+B', desc: 'Blockquote' },
  { keys: 'Ctrl+E', desc: 'Inline code' },
  { keys: 'Ctrl+Alt+C', desc: 'Code block' },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  rows = 8,
  id,
  required: _required,
  maxLength = 10000,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [showHelp, setShowHelp] = useState(false);
  const [focused, setFocused] = useState(false);
  const suppressUpdate = useRef(false);
  const lastValueRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: { class: 'code-block' },
        },
      }),
      LinkExtension.configure({ openOnClick: false }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: markdownToHtml(value),
    onUpdate: ({ editor: ed }) => {
      if (suppressUpdate.current) return;
      const html = ed.getHTML();
      const md = turndown.turndown(html);
      lastValueRef.current = md;
      onChange(md);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        style: `min-height: ${rows * 24}px`,
      },
    },
  });

  // Sync external value changes (e.g., draft restore) into the editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    suppressUpdate.current = true;
    const html = markdownToHtml(value);
    editor.commands.setContent(html);
    suppressUpdate.current = false;
  }, [value, editor]);

  const executeAction = useCallback(
    (action: string) => {
      if (!editor) return;
      const chain = editor.chain().focus();
      switch (action) {
        case 'bold': chain.toggleBold().run(); break;
        case 'italic': chain.toggleItalic().run(); break;
        case 'strike': chain.toggleStrike().run(); break;
        case 'underline': chain.toggleUnderline().run(); break;
        case 'heading': chain.toggleHeading({ level: 2 }).run(); break;
        case 'bulletList': chain.toggleBulletList().run(); break;
        case 'orderedList': chain.toggleOrderedList().run(); break;
        case 'blockquote': chain.toggleBlockquote().run(); break;
        case 'code': chain.toggleCode().run(); break;
        case 'codeBlock': chain.toggleCodeBlock().run(); break;
        case 'link': {
          if (editor.isActive('link')) {
            chain.unsetLink().run();
          } else {
            const url = window.prompt('Enter URL:');
            if (url) chain.setLink({ href: url }).run();
          }
          break;
        }
        default: break;
      }
    },
    [editor],
  );

  const isActive = useCallback(
    (action: string): boolean => {
      if (!editor) return false;
      switch (action) {
        case 'bold': return editor.isActive('bold');
        case 'italic': return editor.isActive('italic');
        case 'strike': return editor.isActive('strike');
        case 'underline': return editor.isActive('underline');
        case 'heading': return editor.isActive('heading');
        case 'bulletList': return editor.isActive('bulletList');
        case 'orderedList': return editor.isActive('orderedList');
        case 'blockquote': return editor.isActive('blockquote');
        case 'code': return editor.isActive('code');
        case 'codeBlock': return editor.isActive('codeBlock');
        case 'link': return editor.isActive('link');
        default: return false;
      }
    },
    [editor],
  );

  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div className={`${styles.editor} ${focused ? styles.editorFocused : ''}`}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${mode === 'write' ? styles.tabActive : ''}`}
          onClick={() => setMode('write')}
        >
          Write
        </button>
        <button
          type="button"
          className={`${styles.tab} ${mode === 'preview' ? styles.tabActive : ''}`}
          onClick={() => setMode('preview')}
        >
          Preview
        </button>
      </div>

      {mode === 'write' ? (
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            {TOOLBAR_BUTTONS.map((btn, i) =>
              btn === 'sep' ? (
                <span key={`sep-${i}`} className={styles.toolbarSep} />
              ) : (
                <button
                  key={btn.action}
                  type="button"
                  className={`${styles.toolbarBtn} ${isActive(btn.action) ? styles.toolbarBtnActive : ''}`}
                  title={btn.shortcut ? `${btn.label} (${btn.shortcut})` : btn.label}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent focus loss
                    executeAction(btn.action);
                  }}
                >
                  {btn.icon}
                </button>
              ),
            )}
          </div>

          {/* TipTap editor */}
          <EditorContent editor={editor} className={styles.tiptapWrap} />
        </>
      ) : (
        <div className={`${styles.preview} ${!value.trim() ? styles.previewEmpty : ''}`}>
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            'Nothing to preview'
          )}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <span className={`${styles.charCount} ${isNearLimit ? styles.charCountWarn : ''}`}>
          {charCount} / {maxLength} characters
        </span>
        <button
          type="button"
          className={styles.helpToggle}
          onClick={() => setShowHelp(!showHelp)}
        >
          {showHelp ? '▾ Hide shortcuts' : '▸ Keyboard shortcuts'}
        </button>
      </div>

      {showHelp && (
        <div className={styles.helpPanel}>
          {SHORTCUT_HELP.map((item) => (
            <div key={item.keys} className={styles.helpRow}>
              <span className={styles.helpSyntax}>{item.keys}</span>
              <span className={styles.helpDesc}>{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

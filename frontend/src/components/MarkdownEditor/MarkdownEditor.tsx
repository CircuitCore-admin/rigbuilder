import { useState, useRef, useCallback, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import {
  BoldIcon, ItalicIcon, StrikethroughIcon, HeadingIcon, LinkIcon,
  ListBulletIcon, ListNumberedIcon, QuoteIcon, CodeIcon, CodeBlockIcon,
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

interface ToolbarAction {
  label: string;
  icon: ReactNode;
  prefix: string;
  suffix: string;
  block?: boolean;
  placeholder?: string;
  shortcut?: string;
  shortcutKey?: string;
}

const TOOLBAR_ACTIONS: (ToolbarAction | 'sep')[] = [
  { label: 'Bold', icon: <BoldIcon size={15} />, prefix: '**', suffix: '**', placeholder: 'bold text', shortcut: 'Ctrl+B', shortcutKey: 'b' },
  { label: 'Italic', icon: <ItalicIcon size={15} />, prefix: '*', suffix: '*', placeholder: 'italic text', shortcut: 'Ctrl+I', shortcutKey: 'i' },
  { label: 'Strikethrough', icon: <StrikethroughIcon size={15} />, prefix: '~~', suffix: '~~', placeholder: 'strikethrough text' },
  'sep',
  { label: 'Heading', icon: <HeadingIcon size={15} />, prefix: '## ', suffix: '', block: true, placeholder: 'Heading' },
  { label: 'Link', icon: <LinkIcon size={15} />, prefix: '[', suffix: '](url)', placeholder: 'link text', shortcut: 'Ctrl+K', shortcutKey: 'k' },
  'sep',
  { label: 'Bulleted list', icon: <ListBulletIcon size={15} />, prefix: '- ', suffix: '', block: true, placeholder: 'list item' },
  { label: 'Numbered list', icon: <ListNumberedIcon size={15} />, prefix: '1. ', suffix: '', block: true, placeholder: 'list item' },
  { label: 'Quote', icon: <QuoteIcon size={15} />, prefix: '> ', suffix: '', block: true, placeholder: 'quote' },
  'sep',
  { label: 'Inline code', icon: <CodeIcon size={15} />, prefix: '`', suffix: '`', placeholder: 'code' },
  { label: 'Code block', icon: <CodeBlockIcon size={15} />, prefix: '```\n', suffix: '\n```', block: true, placeholder: 'code' },
];

const HELP_ITEMS = [
  { syntax: '**bold**', desc: 'Bold' },
  { syntax: '*italic*', desc: 'Italic' },
  { syntax: '~~strike~~', desc: 'Strikethrough' },
  { syntax: '## Heading', desc: 'Heading' },
  { syntax: '[text](url)', desc: 'Link' },
  { syntax: '- item', desc: 'Bullet list' },
  { syntax: '1. item', desc: 'Numbered list' },
  { syntax: '> quote', desc: 'Blockquote' },
  { syntax: '`code`', desc: 'Inline code' },
  { syntax: '```code```', desc: 'Code block' },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  rows = 8,
  id,
  required,
  maxLength = 10000,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [showHelp, setShowHelp] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback(
    (action: ToolbarAction) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const hasSelection = start !== end;

      let insertion: string;
      let selectStart: number;
      let selectEnd: number;

      if (hasSelection) {
        if (action.block && start > 0 && value[start - 1] !== '\n' && value[start - 1] !== '\r') {
          const prefix = '\n' + action.prefix;
          insertion = prefix + selected + action.suffix;
          selectStart = start + prefix.length;
          selectEnd = selectStart + selected.length;
        } else {
          insertion = action.prefix + selected + action.suffix;
          selectStart = start + action.prefix.length;
          selectEnd = selectStart + selected.length;
        }
      } else {
        const placeholderText = action.placeholder ?? '';
        if (action.block && start > 0 && value[start - 1] !== '\n' && value[start - 1] !== '\r') {
          const prefix = '\n' + action.prefix;
          insertion = prefix + placeholderText + action.suffix;
          selectStart = start + prefix.length;
          selectEnd = selectStart + placeholderText.length;
        } else {
          insertion = action.prefix + placeholderText + action.suffix;
          selectStart = start + action.prefix.length;
          selectEnd = selectStart + placeholderText.length;
        }
      }

      const newValue = value.slice(0, start) + insertion + value.slice(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(selectStart, selectEnd);
      });
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      for (const action of TOOLBAR_ACTIONS) {
        if (action === 'sep') continue;
        if (action.shortcutKey && e.key.toLowerCase() === action.shortcutKey) {
          e.preventDefault();
          insertMarkdown(action);
          return;
        }
      }
    },
    [insertMarkdown],
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
            {TOOLBAR_ACTIONS.map((action, i) =>
              action === 'sep' ? (
                <span key={`sep-${i}`} className={styles.toolbarSep} />
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className={styles.toolbarBtn}
                  title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                  onClick={() => insertMarkdown(action)}
                >
                  {action.icon}
                </button>
              ),
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            id={id}
            className={styles.textarea}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            required={required}
            maxLength={maxLength}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
          />
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
          {showHelp ? '▾ Hide help' : '▸ Formatting help'}
        </button>
      </div>

      {showHelp && (
        <div className={styles.helpPanel}>
          {HELP_ITEMS.map((item) => (
            <div key={item.syntax} className={styles.helpRow}>
              <span className={styles.helpSyntax}>{item.syntax}</span>
              <span className={styles.helpDesc}>{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

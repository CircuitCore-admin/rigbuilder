import { useState, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
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
  icon: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: (ToolbarAction | 'sep')[] = [
  { label: 'Bold', icon: 'B', prefix: '**', suffix: '**' },
  { label: 'Italic', icon: 'I', prefix: '*', suffix: '*' },
  { label: 'Strikethrough', icon: 'S̶', prefix: '~~', suffix: '~~' },
  'sep',
  { label: 'Heading', icon: 'H', prefix: '## ', suffix: '', block: true },
  { label: 'Link', icon: '🔗', prefix: '[', suffix: '](url)' },
  'sep',
  { label: 'Bulleted list', icon: '•', prefix: '- ', suffix: '', block: true },
  { label: 'Numbered list', icon: '1.', prefix: '1. ', suffix: '', block: true },
  { label: 'Quote', icon: '❝', prefix: '> ', suffix: '', block: true },
  'sep',
  { label: 'Inline code', icon: '`', prefix: '`', suffix: '`' },
  { label: 'Code block', icon: '```', prefix: '```\n', suffix: '\n```', block: true },
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

      let insertion: string;
      let cursorOffset: number;

      if (action.block && start > 0 && value[start - 1] !== '\n' && value[start - 1] !== '\r') {
        // For block-level syntax, ensure we're at line start
        const prefix = '\n' + action.prefix;
        insertion = prefix + selected + action.suffix;
        cursorOffset = prefix.length + selected.length;
      } else {
        insertion = action.prefix + selected + action.suffix;
        cursorOffset = action.prefix.length + selected.length;
      }

      const newValue = value.slice(0, start) + insertion + value.slice(end);
      onChange(newValue);

      // Restore cursor position
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + cursorOffset;
        ta.setSelectionRange(pos, pos);
      });
    },
    [value, onChange],
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
                  title={action.label}
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
              <span>{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CustomSelect.module.scss';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
  label?: string;
}

export function CustomSelect({ value, onChange, options, placeholder = 'Select…', id, label }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClickOutside, handleKeyDown]);

  const listboxLabel = label ?? placeholder;

  return (
    <div
      className={styles.selectWrapper}
      ref={wrapperRef}
      id={id}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={listboxLabel}
    >
      <button
        type="button"
        className={`${styles.selectTrigger} ${open ? styles.selectTriggerOpen : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        tabIndex={0}
      >
        {selectedLabel
          ? <span className={styles.selectValue}>{selectedLabel}</span>
          : <span className={styles.selectPlaceholder}>{placeholder}</span>
        }
        <svg className={`${styles.selectChevron} ${open ? styles.selectChevronOpen : ''}`} width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className={styles.selectDropdown} role="listbox" aria-label={listboxLabel}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.selectOption} ${opt.value === value ? styles.selectOptionActive : ''}`}
              role="option"
              aria-selected={opt.value === value}
              tabIndex={0}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                }
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 10L8.5 13.5L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

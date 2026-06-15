import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  theme?: 'light' | 'dark';
}

export const EmojiPicker = ({ value, onChange, theme = 'light' }: EmojiPickerProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onChange(emojiData.emoji);
      setIsOpen(false);
    },
    [onChange],
  );

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="grid"
        aria-label={value ? t('reminder.form.changeIcon') : t('reminder.form.selectIcon')}
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          fontSize: '24px',
          cursor: 'pointer',
        }}
      >
        {value || '➕'}
      </button>

      {isOpen && (
        <div style={{ marginTop: '8px', position: 'relative', zIndex: 10 }}>
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
            width="100%"
            height={350}
            searchPlaceHolder={t('reminder.form.searchEmoji')}
            lazyLoadEmojis
          />
        </div>
      )}
    </div>
  );
};

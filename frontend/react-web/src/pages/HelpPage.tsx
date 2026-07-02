import { useState } from 'react';

import logoIcon from '@/assets/logo-icon.svg';

import { HelpContent } from './help/HelpContent';
import type { Locale } from './help/helpData';

type Theme = 'light' | 'dark';

const LIGHT_COLORS = {
  bg: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  primary: '#2563EB',
};

const DARK_COLORS = {
  bg: '#0F172A',
  surface: '#1E293B',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#2D3748',
  primary: '#3B82F6',
};

export const HelpPage = () => {
  const [locale, setLocale] = useState<Locale>('es');
  const [theme, setTheme] = useState<Theme>('light');

  const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

  const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    borderRadius: '6px',
    border: `1px solid ${active ? colors.primary : colors.border}`,
    backgroundColor: active ? colors.primary : 'transparent',
    color: active ? '#FFFFFF' : colors.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        minHeight: '100vh',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {/* Sticky header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
          padding: '16px 24px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={logoIcon}
            alt="Planixor"
            style={{ width: '28px', height: '28px' }}
          />
          <span style={{ fontSize: '18px', fontWeight: 700, color: colors.text }}>
            Planixor
          </span>
          <span style={{ fontSize: '14px', color: colors.textSecondary }}>
            {locale === 'en' ? 'User Manual' : 'Manual de Usuario'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Language toggle */}
          <button
            onClick={() => setLocale('es')}
            style={toggleButtonStyle(locale === 'es')}
            aria-label="Cambiar a español"
            aria-pressed={locale === 'es'}
          >
            ES
          </button>
          <button
            onClick={() => setLocale('en')}
            style={toggleButtonStyle(locale === 'en')}
            aria-label="Switch to English"
            aria-pressed={locale === 'en'}
          >
            EN
          </button>

          {/* Separator */}
          <div
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: colors.border,
              margin: '0 4px',
            }}
          />

          {/* Theme toggle */}
          <button
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            style={{
              padding: '6px 10px',
              fontSize: '16px',
              borderRadius: '6px',
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
          </button>
        </div>
      </header>

      {/* Content */}
      <HelpContent locale={locale} colors={colors} />

      {/* Footer */}
      <footer
        style={{
          padding: '24px',
          borderTop: `1px solid ${colors.border}`,
          textAlign: 'center',
          color: colors.textSecondary,
          fontSize: '13px',
        }}
      >
        &copy; {new Date().getFullYear()} Codenized. All rights reserved.
      </footer>
    </div>
  );
};

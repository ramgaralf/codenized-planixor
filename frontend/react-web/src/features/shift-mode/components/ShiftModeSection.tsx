import { useTranslation } from 'react-i18next';

import { useShiftMode } from '../hooks/useShiftMode';

interface ShiftModeSectionProps {
  sectionClassName?: string;
  sectionTitleClassName?: string;
}

export const ShiftModeSection = ({
  sectionClassName,
  sectionTitleClassName,
}: ShiftModeSectionProps) => {
  const { t } = useTranslation();
  const { enabled, toggle, isLoading } = useShiftMode();

  if (isLoading) {
    return null;
  }

  return (
    <section className={sectionClassName}>
      <h2 className={sectionTitleClassName}>{t('shiftMode.toggle.label')}</h2>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          marginBottom: '12px',
          lineHeight: '1.4',
        }}
      >
        {t('shiftMode.toggle.description')}
      </p>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}
      >
        <span
          role="switch"
          aria-checked={enabled}
          aria-label={t('shiftMode.toggle.label')}
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          style={{
            position: 'relative',
            display: 'inline-block',
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            backgroundColor: enabled ? 'var(--color-primary)' : 'var(--color-border)',
            transition: 'background-color 0.2s ease',
            cursor: 'pointer',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '2px',
              left: enabled ? '22px' : '2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            }}
          />
        </span>
      </div>
    </section>
  );
};

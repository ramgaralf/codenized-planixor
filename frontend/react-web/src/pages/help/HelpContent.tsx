import { getHelpData } from './helpData';
import type { Locale } from './helpData';

interface HelpContentProps {
  locale: Locale;
  colors: {
    bg: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
}

export const HelpContent = ({ locale, colors }: HelpContentProps) => {
  const data = getHelpData(locale);

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Table of Contents */}
      <nav
        style={{
          backgroundColor: colors.surface,
          borderRadius: '12px',
          padding: '24px 32px',
          marginBottom: '48px',
          border: `1px solid ${colors.border}`,
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '16px',
            color: colors.text,
          }}
        >
          {data.tocTitle}
        </h2>
        <ol style={{ paddingLeft: '20px', margin: 0 }}>
          {data.sections.map((section) => (
            <li key={section.id} style={{ marginBottom: '8px' }}>
              <a
                href={`#${section.id}`}
                style={{
                  color: colors.primary,
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      {data.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          style={{ marginBottom: '56px' }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '12px',
              color: colors.text,
            }}
          >
            {section.title}
          </h2>

          <p
            style={{
              fontSize: '15px',
              lineHeight: 1.7,
              color: colors.textSecondary,
              marginBottom: '20px',
            }}
          >
            {section.intro}
          </p>

          <ul
            style={{
              paddingLeft: '20px',
              marginBottom: '24px',
            }}
          >
            {section.steps.map((step, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: '14px',
                  lineHeight: 1.8,
                  color: colors.text,
                  marginBottom: '6px',
                }}
              >
                {step}
              </li>
            ))}
          </ul>

          {section.platformNote && (
            <p
              style={{
                fontSize: '13px',
                fontStyle: 'italic',
                color: colors.textSecondary,
                marginBottom: '16px',
                paddingLeft: '12px',
                borderLeft: `3px solid ${colors.primary}`,
              }}
            >
              {section.platformNote}
            </p>
          )}

          {/* Screenshots */}
          {section.screenshots.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              {section.screenshots.map((src, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    backgroundColor: colors.surface,
                  }}
                >
                  <img
                    src={src}
                    alt={`${section.title} - screenshot ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  );
};

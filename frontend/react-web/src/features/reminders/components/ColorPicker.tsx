import { useCallback } from 'react';

import { COLOR_FAMILIES, getRecommendedIndices } from '@features/reminders/constants';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  theme?: 'light' | 'dark';
}

export const ColorPicker = ({ value, onChange, theme = 'light' }: ColorPickerProps) => {
  const recommendedIndices = getRecommendedIndices(theme);

  const handleColorSelect = useCallback(
    (color: string) => {
      onChange(color);
    },
    [onChange],
  );

  return (
    <div
      role="radiogroup"
      aria-label="Color palette"
      style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
    >
      {COLOR_FAMILIES.map((family) => (
        <div
          key={family.name}
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          {family.shades.map((color, shadeIndex) => {
            const isSelected = value === color;
            const isRecommended = recommendedIndices.includes(shadeIndex);

            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${family.name} shade ${shadeIndex + 1}${isRecommended ? ' (recommended)' : ''}`}
                onClick={() => handleColorSelect(color)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: isSelected
                    ? '3px solid var(--color-text-primary)'
                    : 'none',
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  opacity: isRecommended ? 1 : 0.5,
                  boxShadow: isRecommended && !isSelected
                    ? '0 0 0 1px var(--color-border)'
                    : 'none',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                    style={{ pointerEvents: 'none' }}
                  >
                    <path
                      d="M2 7.5L5.5 11L12 3"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

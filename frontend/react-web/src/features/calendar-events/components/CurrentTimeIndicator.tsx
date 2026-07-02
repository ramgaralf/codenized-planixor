import { useEffect, useState } from 'react';

const HOUR_SLOT_HEIGHT = 60;
const UPDATE_INTERVAL_MS = 60_000;

const getCurrentTimeOffset = (): number => {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  return (totalMinutes / 60) * HOUR_SLOT_HEIGHT;
};

/**
 * CurrentTimeIndicator — blue horizontal line with circle marker showing the current time.
 *
 * Shown only when viewing the current date in Day view. Updates position every 60 seconds.
 *
 * **Validates: Requirements 3.6, 3.7**
 */
export const CurrentTimeIndicator = () => {
  const [topOffset, setTopOffset] = useState(getCurrentTimeOffset);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTopOffset(getCurrentTimeOffset());
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${topOffset}px`,
        left: '64px',
        right: 0,
        height: '2px',
        backgroundColor: 'var(--color-primary)',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '-5px',
          top: '-4px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
        }}
      />
    </div>
  );
};

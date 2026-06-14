import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCalendarStore } from '@/stores/calendarStore';

import styles from './YearView.module.css';

const getFirstDayOfWeek = (locale: string): number => {
  // Monday = 1, Sunday = 0
  return locale.startsWith('es') ? 1 : 0;
};

const getLocalizedWeekdayInitials = (locale: string, firstDayOfWeek: number): string[] => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const days: string[] = [];

  // Use a known Monday (Jan 6, 2020) as reference
  const referenceMonday = new Date(2020, 0, 6);

  for (let i = 0; i < 7; i++) {
    const dayOffset = firstDayOfWeek === 1 ? i : (i + 6) % 7;
    const date = new Date(referenceMonday);
    date.setDate(referenceMonday.getDate() + dayOffset);
    days.push(formatter.format(date));
  }

  return days;
};

const getLocalizedMonthName = (year: number, month: number, locale: string): string => {
  const date = new Date(year, month, 1);
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
};

interface MiniMonthDay {
  dayNumber: number;
  isToday: boolean;
  date: Date;
}

const getMiniMonthGrid = (
  year: number,
  month: number,
  firstDayOfWeek: number,
  today: Date
): { leadingBlanks: number; days: MiniMonthDay[]; trailingBlanks: number } => {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastOfMonth.getDate();

  const startDayOfWeek = firstOfMonth.getDay(); // 0=Sun, 1=Mon, ...

  let leadingBlanks: number;
  if (firstDayOfWeek === 1) {
    leadingBlanks = (startDayOfWeek + 6) % 7;
  } else {
    leadingBlanks = startDayOfWeek;
  }

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const days: MiniMonthDay[] = [];
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const isToday = year === todayYear && month === todayMonth && day === todayDate;
    days.push({
      dayNumber: day,
      isToday,
      date: new Date(year, month, day),
    });
  }

  const totalCells = leadingBlanks + totalDaysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const trailingBlanks = rows * 7 - totalCells;

  return { leadingBlanks, days, trailingBlanks };
};

interface MiniMonthProps {
  year: number;
  month: number;
  locale: string;
  firstDayOfWeek: number;
  weekdayInitials: string[];
  today: Date;
  onMonthClick: (year: number, month: number) => void;
  onDayClick: (date: Date) => void;
}

const MiniMonth = ({
  year,
  month,
  locale,
  firstDayOfWeek,
  weekdayInitials,
  today,
  onMonthClick,
  onDayClick,
}: MiniMonthProps) => {
  const monthName = useMemo(() => getLocalizedMonthName(year, month, locale), [year, month, locale]);
  const { leadingBlanks, days, trailingBlanks } = useMemo(
    () => getMiniMonthGrid(year, month, firstDayOfWeek, today),
    [year, month, firstDayOfWeek, today]
  );

  return (
    <div className={styles.miniMonth}>
      <button
        className={styles.monthHeader}
        onClick={() => onMonthClick(year, month)}
        aria-label={monthName}
        type="button"
      >
        {monthName}
      </button>

      <div className={styles.weekdayRow}>
        {weekdayInitials.map((initial, index) => (
          <span key={index} className={styles.weekdayLabel}>
            {initial}
          </span>
        ))}
      </div>

      <div className={styles.dayGrid}>
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`lead-${i}`} className={styles.dayEmpty} />
        ))}

        {days.map((day) => (
          <button
            key={day.dayNumber}
            className={`${styles.dayButton} ${day.isToday ? styles.dayButtonToday : ''}`}
            onClick={() => onDayClick(day.date)}
            aria-label={day.date.toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            aria-current={day.isToday ? 'date' : undefined}
            type="button"
          >
            {day.dayNumber}
          </button>
        ))}

        {Array.from({ length: trailingBlanks }, (_, i) => (
          <div key={`trail-${i}`} className={styles.dayEmpty} />
        ))}
      </div>
    </div>
  );
};

export const YearView = () => {
  const { t, i18n } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);
  const setView = useCalendarStore((state) => state.setView);
  const locale = i18n.language;
  const today = useMemo(() => new Date(), []);

  const year = currentDate instanceof Date ? currentDate.getFullYear() : new Date(currentDate).getFullYear();

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(locale), [locale]);
  const weekdayInitials = useMemo(
    () => getLocalizedWeekdayInitials(locale, firstDayOfWeek),
    [locale, firstDayOfWeek]
  );

  const handleMonthClick = (clickedYear: number, clickedMonth: number) => {
    const store = useCalendarStore.getState();
    const newDate = new Date(clickedYear, clickedMonth, 1);
    useCalendarStore.setState({ currentDate: newDate });
    store.setView('month');
  };

  const handleDayClick = (date: Date) => {
    useCalendarStore.setState({ currentDate: date });
    setView('day');
  };

  return (
    <div className={styles.yearView} role="grid" aria-label={t('views.year')}>
      {Array.from({ length: 12 }, (_, monthIndex) => (
        <MiniMonth
          key={monthIndex}
          year={year}
          month={monthIndex}
          locale={locale}
          firstDayOfWeek={firstDayOfWeek}
          weekdayInitials={weekdayInitials}
          today={today}
          onMonthClick={handleMonthClick}
          onDayClick={handleDayClick}
        />
      ))}
    </div>
  );
};

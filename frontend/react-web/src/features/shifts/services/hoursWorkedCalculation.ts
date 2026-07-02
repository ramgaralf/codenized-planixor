/**
 * Calculates the hours worked (in minutes) given start and end times.
 *
 * Both startTime and endTime are expressed as minutes from midnight (0–1439).
 *
 * - If startTime equals endTime, returns 1440 (24 hours — special case).
 * - Otherwise, computes (endTime - startTime + 1440) % 1440, which handles
 *   overnight shifts (end before start) by treating them as crossing midnight.
 *   Maximum result for unequal times: 1439 minutes.
 *
 * @param startTime Minutes from midnight (0–1439)
 * @param endTime Minutes from midnight (0–1439)
 * @returns Duration in minutes (1–1440)
 */
export const calculateHoursWorked = (
  startTime: number,
  endTime: number,
): number => {
  if (startTime === endTime) {
    return 1440;
  }

  return (endTime - startTime + 1440) % 1440;
};

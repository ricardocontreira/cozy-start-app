import { toZonedTime } from 'date-fns-tz';

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns the current date/time in Brasilia Standard Time (America/Sao_Paulo)
 */
export function getNowInBrasilia(): Date {
  return toZonedTime(new Date(), BRASILIA_TIMEZONE);
}

/**
 * Returns the current month and year in Brasilia timezone
 */
export function getCurrentMonthYear(): { month: string; year: string } {
  const now = getNowInBrasilia();
  return {
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear())
  };
}

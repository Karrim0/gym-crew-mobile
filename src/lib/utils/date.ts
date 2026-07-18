import type { Weekday } from "@/types/domain";

const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const weekdayOrder: Weekday[] = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export function toISODateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a database `date` value as a local calendar day.
 *
 * `new Date("2026-07-18")` is interpreted as UTC by JavaScript, which can
 * move the value to the previous day in some timezones. Constructing the
 * date from its parts keeps schedule calculations on the device's local day.
 */
export function parseISODateOnly(value: string) {
  const match = ISO_DATE_ONLY_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid ISO date-only value: ${value}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    throw new Error(`Invalid ISO date-only value: ${value}`);
  }

  return parsed;
}

export function normalizeISODateOnly(value: string) {
  return toISODateOnly(parseISODateOnly(value));
}

export function getWeekday(date = new Date()): Weekday {
  const map: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return map[date.getDay()];
}

export function getWeekdayFromISODate(value: string): Weekday {
  return getWeekday(parseISODateOnly(value));
}

export function startOfTrainingWeek(date = new Date()) {
  const copy = new Date(date);
  const daysSinceSaturday = (copy.getDay() + 1) % 7;
  copy.setDate(copy.getDate() - daysSinceSaturday);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getTrainingWeekRange(anchor: Date | string = new Date()) {
  const anchorDate = typeof anchor === "string" ? parseISODateOnly(anchor) : anchor;
  const start = startOfTrainingWeek(anchorDate);
  const end = addDays(start, 6);
  return {
    start,
    end,
    startISO: toISODateOnly(start),
    endISO: toISODateOnly(end),
  };
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}`.padStart(2, "0") + ":" + `${safe % 60}`.padStart(2, "0");
}

export function formatShortDate(value: string, language: "ar" | "en" = "en") {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

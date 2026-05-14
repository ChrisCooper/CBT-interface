import { z } from "zod";

export const IntervalScheduleSchema = z.object({
  type: z.literal("interval"),
  intervalDays: z.number().int().min(1).max(3650),
});
export type IntervalSchedule = z.infer<typeof IntervalScheduleSchema>;

export const DayOfWeekScheduleSchema = z.object({
  type: z.literal("day_of_week"),
  // 0 = Sunday, 6 = Saturday (matches JS Date.getDay())
  dayOfWeek: z.number().int().min(0).max(6),
});
export type DayOfWeekSchedule = z.infer<typeof DayOfWeekScheduleSchema>;

export const DayOfMonthScheduleSchema = z.object({
  type: z.literal("day_of_month"),
  dayOfMonth: z.number().int().min(1).max(31),
});
export type DayOfMonthSchedule = z.infer<typeof DayOfMonthScheduleSchema>;

export const DayOfYearScheduleSchema = z.object({
  type: z.literal("day_of_year"),
  month: z.number().int().min(1).max(12),
  dayOfMonth: z.number().int().min(1).max(31),
});
export type DayOfYearSchedule = z.infer<typeof DayOfYearScheduleSchema>;

export const ScheduleSchema = z.discriminatedUnion("type", [
  IntervalScheduleSchema,
  DayOfWeekScheduleSchema,
  DayOfMonthScheduleSchema,
  DayOfYearScheduleSchema,
]);
export type Schedule = z.infer<typeof ScheduleSchema>;

export const SCHEDULE_LABELS: Record<Schedule["type"], string> = {
  interval: "Every N days",
  day_of_week: "Day of week",
  day_of_month: "Day of month",
  day_of_year: "Day of year",
};

export const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * All date math is calendar-only: inputs and outputs represent a calendar date
 * with no time component. We use a Date pinned to midnight UTC to avoid
 * timezone drift, and round inputs to the start of their UTC day.
 */
function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const r = startOfUTCDay(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/**
 * Format a Date as a PG `date`-friendly ISO date string (YYYY-MM-DD), using
 * the date's UTC components.
 */
export function toIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear().toString().padStart(4, "0");
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a YYYY-MM-DD string (as returned by Postgres `date` columns) into a
 * Date pinned to midnight UTC.
 */
export function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Last valid day of a given month. Used to clamp things like "31st" in a
 * month with fewer days.
 */
function lastDayOfMonth(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

/**
 * Compute the first occurrence of a schedule on or after `today`.
 *
 * - interval: today itself (the first instance is due immediately).
 * - calendar: the next matching date, today included.
 */
export function firstDueDate(schedule: Schedule, today: Date): Date {
  const t = startOfUTCDay(today);
  switch (schedule.type) {
    case "interval":
      return t;
    case "day_of_week": {
      const diff = (schedule.dayOfWeek - t.getUTCDay() + 7) % 7;
      return addDays(t, diff);
    }
    case "day_of_month":
      return nextDayOfMonth(t, schedule.dayOfMonth, /* inclusive */ true);
    case "day_of_year":
      return nextDayOfYear(t, schedule.month, schedule.dayOfMonth, /* inclusive */ true);
  }
}

/**
 * Compute the next occurrence strictly after `anchor`.
 *
 * - interval: anchor + intervalDays.
 * - calendar: the next matching date strictly after anchor.
 *
 * For interval schedules the anchor is typically the previous completion;
 * for calendar schedules it's typically the previous instance's dueDate.
 */
export function nextDueDate(schedule: Schedule, anchor: Date): Date {
  const a = startOfUTCDay(anchor);
  switch (schedule.type) {
    case "interval":
      return addDays(a, schedule.intervalDays);
    case "day_of_week": {
      // Always move forward at least one day; full week if same weekday.
      const diff = ((schedule.dayOfWeek - a.getUTCDay() + 7) % 7) || 7;
      return addDays(a, diff);
    }
    case "day_of_month":
      return nextDayOfMonth(a, schedule.dayOfMonth, /* inclusive */ false);
    case "day_of_year":
      return nextDayOfYear(a, schedule.month, schedule.dayOfMonth, /* inclusive */ false);
  }
}

/**
 * The next day-of-month occurrence, scanning forward month by month.
 * If `inclusive` is true and `from` itself matches, returns `from`.
 * Months with fewer days than `targetDay` (e.g. "31st" in February) are
 * clamped to the month's last day rather than skipped.
 */
function nextDayOfMonth(from: Date, targetDay: number, inclusive: boolean): Date {
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();

  for (let i = 0; i < 13; i++) {
    const day = Math.min(targetDay, lastDayOfMonth(year, month));
    const candidate = new Date(Date.UTC(year, month, day));
    if (inclusive ? candidate >= from : candidate > from) {
      return candidate;
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  // Unreachable: any target maps to at most two candidates per year.
  throw new Error("nextDayOfMonth: failed to find candidate");
}

/**
 * The next day-of-year occurrence (a specific month + day), scanning by year.
 * If `inclusive` is true and `from` itself matches, returns `from`.
 * Feb 29 is clamped to Feb 28 in non-leap years.
 */
function nextDayOfYear(
  from: Date,
  targetMonth: number,
  targetDay: number,
  inclusive: boolean,
): Date {
  const monthIdx = targetMonth - 1;
  for (let year = from.getUTCFullYear(); year < from.getUTCFullYear() + 2; year++) {
    const day = Math.min(targetDay, lastDayOfMonth(year, monthIdx));
    const candidate = new Date(Date.UTC(year, monthIdx, day));
    if (inclusive ? candidate >= from : candidate > from) {
      return candidate;
    }
  }
  throw new Error("nextDayOfYear: failed to find candidate");
}

export function describeSchedule(schedule: Schedule): string {
  switch (schedule.type) {
    case "interval":
      return schedule.intervalDays === 1
        ? "Every day"
        : `Every ${schedule.intervalDays} days`;
    case "day_of_week":
      return `Every ${DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}`;
    case "day_of_month": {
      const suffix = ordinalSuffix(schedule.dayOfMonth);
      return `Every month on the ${schedule.dayOfMonth}${suffix}`;
    }
    case "day_of_year": {
      const m = MONTH_LABELS[schedule.month - 1];
      return `Every year on ${m} ${schedule.dayOfMonth}`;
    }
  }
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

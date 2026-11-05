export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function parseDateKey(value: string): Date {
  const parts = value.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

export function addDays(value: string, amount: number): string {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function differenceInCalendarDays(from: string, to: string): number {
  const a = parseDateKey(from).getTime();
  const b = parseDateKey(to).getTime();
  return Math.round((b - a) / 86400000);
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseDateKey(value).toLocaleDateString(undefined, options || {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function challengeDay(
  startDate: string,
  today: string,
  pausedDays: number,
  status: "active" | "paused" | "completed",
  pausedAt?: string
): number {
  let elapsed = differenceInCalendarDays(startDate, today);
  if (status === "paused" && pausedAt) {
    elapsed -= Math.max(0, differenceInCalendarDays(pausedAt, today));
  }
  return Math.max(0, elapsed - pausedDays + 1);
}

export function remainingDays(day: number, target: number): number {
  return Math.max(0, target - day);
}

export function isGoalMet(
  mode: "pornography" | "masturbation" | "both" | "awareness",
  log: { pornographyUsed: boolean; masturbationReported: boolean } | undefined
): boolean {
  if (!log) return false;
  if (mode === "awareness") return true;
  if (mode === "pornography") return !log.pornographyUsed;
  if (mode === "masturbation") return !log.masturbationReported;
  return !log.pornographyUsed && !log.masturbationReported;
}

export function calculateStreak(
  logs: Record<string, { pornographyUsed: boolean; masturbationReported: boolean }>,
  mode: "pornography" | "masturbation" | "both" | "awareness",
  today: string = dateKey()
): number {
  let cursor = today;
  let streak = 0;
  // A not-yet-completed current day does not break yesterday's streak.
  if (!logs[cursor]) cursor = addDays(cursor, -1);
  for (let index = 0; index < 500; index += 1) {
    const log = logs[cursor];
    if (!isGoalMet(mode, log)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function lastNDates(count: number, today: string = dateKey()): string[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
}
import { DateTime } from "luxon";

export function resolveTimeZone(tz = "UTC") {
  return DateTime.local().setZone(tz).isValid ? tz : "UTC";
}

export function buildUtcDateRange(startDate, endDate, tz = "UTC") {
  const zone = resolveTimeZone(tz);

  const start = DateTime.fromISO(startDate, { zone })
    .startOf("day")
    .toUTC()
    .toJSDate();

  const end = DateTime.fromISO(endDate, { zone })
    .endOf("day")
    .toUTC()
    .toJSDate();

  return { start, end, zone };
}

export function buildDashboardRange({ startDate, endDate, tz = "UTC" } = {}) {
  const zone = resolveTimeZone(tz);

  const now = DateTime.now().setZone(zone);

  const startDt = startDate
    ? DateTime.fromISO(startDate, { zone }).startOf("day")
    : now.minus({ days: 29 }).startOf("day");

  const endDt = endDate
    ? DateTime.fromISO(endDate, { zone }).endOf("day")
    : now.endOf("day");

  return {
    start: startDt.toUTC().toJSDate(),
    end: endDt.toUTC().toJSDate(),
    startDt,
    endDt,
    zone,
  };
}

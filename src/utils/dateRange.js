import { DateTime } from "luxon";

const GROUP_CONFIG = {
  hour: { unit: "hour", dateFormat: "yyyy-MM-dd HH:00" },
  day: { unit: "day", dateFormat: "yyyy-MM-dd" },
  week: { unit: "week", dateFormat: "kkkk-'W'WW" },
  month: { unit: "month", dateFormat: "yyyy-MM" },
  year: { unit: "year", dateFormat: "yyyy" },
};

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

export function buildDashboardRange({
  startDate,
  endDate,
  tz = "UTC",
  groupBy,
} = {}) {
  const zone = resolveTimeZone(tz);

  const now = DateTime.now().setZone(zone);

  const startDt = startDate
    ? DateTime.fromISO(startDate, { zone }).startOf("day")
    : now.minus({ days: 29 }).startOf("day");

  const endDt = endDate
    ? DateTime.fromISO(endDate, { zone }).endOf("day")
    : now.endOf("day");

  let resolvedGroup = groupBy;

  if (!resolvedGroup || !GROUP_CONFIG[resolvedGroup]) {
    const diffDays = endDt.diff(startDt, "days").days;

    if (diffDays <= 1) resolvedGroup = "hour";
    else if (diffDays <= 7) resolvedGroup = "day";
    else if (diffDays <= 90) resolvedGroup = "week";
    else if (diffDays <= 365) resolvedGroup = "month";
    else resolvedGroup = "year";
  }

  const { unit, dateFormat } = GROUP_CONFIG[resolvedGroup];

  return {
    start: startDt.toUTC().toJSDate(),
    end: endDt.toUTC().toJSDate(),
    startDt,
    endDt,
    zone,
    unit,
    dateFormat,
  };
}

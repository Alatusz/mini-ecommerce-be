import { DateTime } from "luxon";

export function buildUtcDateRange(startDate, endDate, tz = "UTC") {
  const zone = DateTime.local().setZone(tz).isValid ? tz : "UTC";

  const start = DateTime.fromISO(startDate, { zone })
    .startOf("day")
    .toUTC()
    .toJSDate();

  const end = DateTime.fromISO(endDate, { zone })
    .startOf("day")
    .toUTC()
    .toJSDate();

  return { start, end, zone };
}

import { ZoneSchedule } from "@/lib/quietzone-types";

export const DEFAULT_ZONE_SCHEDULE: ZoneSchedule = {
  enabled: false,
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "17:00",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function normalizeZoneSchedule(schedule?: Partial<ZoneSchedule> | null): ZoneSchedule {
  return {
    enabled: Boolean(schedule?.enabled),
    daysOfWeek: Array.isArray(schedule?.daysOfWeek)
      ? [...new Set(schedule.daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort(
          (a, b) => a - b
        )
      : [...DEFAULT_ZONE_SCHEDULE.daysOfWeek],
    startTime: isValidTime(schedule?.startTime || "") ? (schedule?.startTime as string) : DEFAULT_ZONE_SCHEDULE.startTime,
    endTime: isValidTime(schedule?.endTime || "") ? (schedule?.endTime as string) : DEFAULT_ZONE_SCHEDULE.endTime,
  };
}

export function getZoneScheduleSummary(schedule?: Partial<ZoneSchedule> | null) {
  const normalized = normalizeZoneSchedule(schedule);

  if (!normalized.enabled) {
    return "Always active";
  }

  const daysLabel =
    normalized.daysOfWeek.length === 7
      ? "Every day"
      : normalized.daysOfWeek.map((day) => DAY_LABELS[day]).join(", ");

  return `${daysLabel} ${normalized.startTime}-${normalized.endTime}`;
}

export function validateZoneSchedule(schedule: ZoneSchedule) {
  if (!schedule.enabled) {
    return "";
  }

  if (schedule.daysOfWeek.length === 0) {
    return "Pick at least one day for the schedule.";
  }

  if (!isValidTime(schedule.startTime) || !isValidTime(schedule.endTime)) {
    return "Schedule times must use HH:mm format.";
  }

  if (schedule.startTime === schedule.endTime) {
    return "Schedule start and end times must be different.";
  }

  return "";
}

export const JOB_STATUSES = [
  "New",
  "Contacted",
  "Scheduled",
  "In Shop",
  "Ready for Pickup",
  "Completed",
  "Not Sold",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const SERVICE_TYPES = [
  "Window Tint",
  "Remote Starter",
  "Alarm / Security",
  "Custom Mod",
  "Audio",
  "Other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const DRIVE_SERVICE_FOLDERS: Record<string, string> = {
  "Window Tint": "Tint-Jobs",
  "Remote Starter": "Remote-Starters",
  "Alarm / Security": "Security-Installs",
  "Custom Mod": "Custom-Mods",
  Audio: "Audio",
  Other: "Other",
};

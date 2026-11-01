import type { Settings } from "../../../../shared/models";

export const defaults: Settings = {
  timeZone: "Europe/Paris",
  weekStartsOn: "MONDAY",
  theme: "SYSTEM",
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLong: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  notificationsEnabled: false,
  soundEnabled: true,
  soundName: "bell",
  dailyFocusGoalMinutes: 120,
  subtasksCompleteParent: false,
  shortcutsEnabled: true,
  compactMode: false,
};

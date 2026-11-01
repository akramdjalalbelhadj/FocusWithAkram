import {
  Archive,
  CalendarDays,
  ChartNoAxesColumn,
  Folder,
  Grid2X2,
  House,
  ListChecks,
  Settings,
  Timer,
} from "lucide-react";

export const nav = [
  ["/", "Tableau de bord", House],
  ["/matrix", "Matrice d’Eisenhower", Grid2X2],
  ["/tasks", "Mes tâches", ListChecks],
  ["/focus", "Focus / Pomodoro", Timer],
  ["/calendar", "Calendrier", CalendarDays],
  ["/statistics", "Statistiques", ChartNoAxesColumn],
  ["/projects", "Projets", Folder],
  ["/archives", "Archives", Archive],
  ["/settings", "Paramètres", Settings],
] as const;

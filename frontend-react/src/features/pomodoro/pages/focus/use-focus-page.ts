import { useState } from "react";
import type {
  DayHistory,
  SessionType,
  Task,
} from "../../../../../../shared/models";
import { formatDay } from "../../../../../../shared/time";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
export function useFocusPage() {
  const app = useApp(),
    tasks = useApi<Task[]>("tasks/priorities"),
    history = useApi<DayHistory[]>("pomodoro/history/daily"),
    [type, setType] = useState<SessionType>("WORK"),
    [taskId, setTaskId] = useState(""),
    [config, setConfig] = useState(false);
  const s = app.session,
    cfg = app.settings,
    today = history.data?.find(
      (d) => d.date === formatDay(new Date(), cfg.timeZone),
    ),
    idle =
      (type === "WORK"
        ? cfg.workMinutes
        : type === "SHORT_BREAK"
          ? cfg.shortBreakMinutes
          : cfg.longBreakMinutes) * 60;
  return {
    app,
    tasks,
    history,
    type,
    setType,
    taskId,
    setTaskId,
    config,
    setConfig,
    s,
    cfg,
    today,
    idle,
  };
}

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SessionState,
  SessionType,
  Settings,
} from "../../../../shared/models";
import { formatClock } from "../../../../shared/time";
import { remainingSeconds } from "../../../../shared/timer";
import { api } from "../api/http-client";
import { useApi } from "../api/use-api";
import { readTimer } from "../pomodoro/timer-storage";
import { defaults } from "../settings/default-settings";

export function useAppState() {
  const qc = useQueryClient(),
    settingsQuery = useApi<Settings>("settings");
  const settings = settingsQuery.data || defaults;
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(
      () => readTimer()?.state || null,
    ),
    [offset, setOffset] = useState(() => readTimer()?.offset || 0),
    [now, setNow] = useState(Date.now()),
    [offline, setOffline] = useState(false);
  const [undo, setUndo] = useState<(() => Promise<void>) | null>(null);
  const accept = useCallback((s: SessionState) => {
    setSessionState(s);
    setOffset(Date.parse(s.serverTime) - Date.now());
    setOffline(false);
    try {
      localStorage.setItem(
        "ff.react.timer",
        JSON.stringify({
          state: s,
          offset: Date.parse(s.serverTime) - Date.now(),
        }),
      );
    } catch {}
  }, []);
  const sync = useCallback(async () => {
    try {
      accept(await api<SessionState>("pomodoro/sessions/active"));
    } catch {
      setOffline(true);
    }
  }, [accept]);
  useEffect(() => {
    void sync();
    const tick = setInterval(() => setNow(Date.now()), 250);
    const resync = () => void sync();
    window.addEventListener("focus", resync);
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      clearInterval(tick);
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [sync]);
  useEffect(() => {
    if (!settingsQuery.data) return;
    const t = settings.theme;
    document.documentElement.dataset.theme =
      t === "SYSTEM"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : t.toLowerCase();
    try {
      localStorage.setItem("ff.theme", t);
    } catch {}
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const f = () => {
      if (t === "SYSTEM")
        document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
    };
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [settings.theme, settingsQuery.data]);
  useEffect(() => {
    document.documentElement.classList.toggle("compact", settings.compactMode);
  }, [settings.compactMode]);
  const refresh = useCallback(() => qc.invalidateQueries(), [qc]);
  async function mutate<T>(
    path: string,
    method = "POST",
    body: unknown = {},
    success = "Enregistré.",
  ): Promise<T> {
    setBusy(true);
    setError("");
    try {
      const result = await api<T>(path, method, body);
      await refresh();
      if (success) setMessage(success);
      return result;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function sessionAction(
    action: string,
    type: SessionType = "WORK",
    taskId?: string,
  ) {
    const path =
      action === "start"
        ? "pomodoro/sessions"
        : `pomodoro/sessions/${sessionState?.session?.id}/${action}`;
    accept(
      await mutate<SessionState>(
        path,
        "POST",
        action === "start"
          ? { type, taskId: type === "WORK" ? taskId : null }
          : {},
        "",
      ),
    );
  }
  const session = sessionState?.session || null;
  const remaining = session
    ? Math.ceil(remainingSeconds(session, now, offset))
    : settings.workMinutes * 60;
  const closing = useRef(false);
  useEffect(() => {
    if (
      session?.status !== "RUNNING" ||
      remaining > 0 ||
      closing.current ||
      offline
    )
      return;
    closing.current = true;
    api<SessionState>(`pomodoro/sessions/${session.id}/complete`, "POST", {})
      .then(async (s) => {
        accept(s);
        await refresh();
        setMessage("Session terminée.");
        if (
          settings.notificationsEnabled &&
          Notification.permission === "granted"
        )
          new Notification("FocusWithAkram", { body: "Session terminée" });
        if (settings.soundEnabled) {
          const c = new AudioContext(),
            o = c.createOscillator(),
            g = c.createGain();
          o.connect(g);
          g.connect(c.destination);
          o.frequency.value =
            settings.soundName === "soft"
              ? 440
              : settings.soundName === "chime"
                ? 880
                : 660;
          o.type = settings.soundName === "soft" ? "sine" : "triangle";
          g.gain.setValueAtTime(0.1, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
          o.start();
          o.stop(c.currentTime + 0.7);
          o.onended = () => void c.close();
        }
        const next = session.next;
        if (
          next.type === "WORK"
            ? settings.autoStartWork
            : settings.autoStartBreaks
        ) {
          accept(
            await api<SessionState>("pomodoro/sessions", "POST", {
              type: next.type,
              taskId: next.type === "WORK" ? session.taskId : null,
            }),
          );
        }
      })
      .catch((e) => {
        setError(e.message);
        setOffline(true);
      })
      .finally(() => {
        closing.current = false;
      });
  }, [remaining, session, offline, accept, refresh, settings]);
  useEffect(() => {
    document.title = session
      ? `${formatClock(remaining)} · FocusWithAkram`
      : "FocusWithAkram";
  }, [remaining, session]);
  return {
    settings,
    settingsQuery,
    message,
    setMessage,
    error,
    setError,
    busy,
    mutate,
    refresh,
    session,
    remaining,
    sessionAction,
    offline,
    undo,
    setUndo,
  };
}

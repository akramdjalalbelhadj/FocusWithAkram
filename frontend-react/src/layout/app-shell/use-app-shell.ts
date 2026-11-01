import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../core/state/use-app";
import { safely } from "../../core/utils/safely";
import { useTasks } from "../../features/tasks/hooks/use-tasks";
export function useShell() {
  const app = useApp(),
    actions = useTasks(),
    navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
      localStorage.getItem("ff.sidebar.collapsed") === "true",
    ),
    [palette, setPalette] = useState(false),
    [more, setMore] = useState(false);
  useEffect(() => {
    let prefix = false;
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (
        !app.settings.shortcutsEnabled ||
        document.querySelector("dialog[open]") ||
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        )
      )
        return;
      if (prefix) {
        prefix = false;
        const routes: Record<string, string> = {
          d: "/",
          m: "/matrix",
          t: "/tasks",
          f: "/focus",
          c: "/calendar",
          s: "/statistics",
          a: "/archives",
        };
        if (routes[e.key]) navigate(routes[e.key]);
        return;
      }
      if (e.key === "g") prefix = true;
      if (e.key === "n") actions.setEditor({});
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
      }
      if (e.key === " ") {
        e.preventDefault();
        safely(
          app.sessionAction(
            app.session
              ? app.session.status === "PAUSED"
                ? "resume"
                : "pause"
              : "start",
          ),
        );
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [app, actions, navigate]);
  return {
    app,
    navigate,
    collapsed,
    setCollapsed,
    palette,
    setPalette,
    more,
    setMore,
  };
}

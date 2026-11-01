import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Target,
  House,
  Grid2X2,
  ListChecks,
  Timer,
  CalendarDays,
  ChartNoAxesColumn,
  Folder,
  Archive,
  Settings,
  Search,
  ChevronLeft,
  Menu,
} from "lucide-react";
import type { SearchResult } from "../../shared/models";
import { formatClock } from "../../shared/time";
import { Provider, useApp, safely } from "./state";
import { TaskProvider, useTasks } from "./tasks";
import { MatrixPage, CalendarPage, NewTask } from "./planning";
import {
  DashboardPage,
  TasksPage,
  FocusPage,
  StatisticsPage,
} from "./productivity";
import { ProjectsPage, ArchivesPage, SettingsPage } from "./management";
import { Modal, ErrorBox } from "./ui";
import { query, useApi } from "./api";
import "./styles.css";
const nav = [
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
function Palette({ close }: { close: () => void }) {
  const [q, setQ] = useState(""),
    data = useApi<SearchResult>(q ? "search?" + query({ q }) : null),
    a = useTasks(),
    navigate = useNavigate(),
    app = useApp();
  return (
    <Modal title="Rechercher ou lancer une commande" close={close}>
      <input
        autoFocus
        aria-label="Recherche globale"
        placeholder="Tâche, projet, commande…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div
        className="palette-results"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const buttons = [...e.currentTarget.querySelectorAll("button")];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            buttons[
              (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                buttons.length
            ]?.focus();
          }
        }}
      >
        <button
          onClick={() => {
            a.setEditor({});
            close();
          }}
        >
          + Nouvelle tâche
        </button>
        <button
          onClick={() => {
            safely(app.sessionAction("start").then(() => navigate("/focus")));
            close();
          }}
        >
          Démarrer un Pomodoro
        </button>
        <button
          onClick={() =>
            safely(
              app
                .mutate("settings", "PATCH", {
                  theme: app.settings.theme === "DARK" ? "LIGHT" : "DARK",
                })
                .then(close),
            )
          }
        >
          Basculer le thème
        </button>
        {nav
          .filter(([, l]) => l.toLowerCase().includes(q.toLowerCase()))
          .map(([path, l]) => (
            <button
              key={path}
              onClick={() => {
                navigate(path);
                close();
              }}
            >
              {l}
            </button>
          ))}
        {data.data?.tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              a.setDetail(t.id);
              close();
            }}
          >
            {t.quadrant} · {t.title}
          </button>
        ))}
        {data.data?.projects.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              navigate("/projects");
              close();
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <ErrorBox error={data.error} retry={data.refetch} />
    </Modal>
  );
}
function Shell() {
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
  return (
    <>
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
        <aside className="sidebar">
          <a href="/" className="logo">
            <Target />
            <span>
              FocusWith<b>Akram</b>
            </span>
          </a>
          <nav aria-label="Navigation principale">
            {nav.map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                title={collapsed ? label : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-landscape" aria-hidden="true">
            <i />
            <b />
            <span />
          </div>
          {app.session && (
            <NavLink to="/focus" className="session-pill">
              <Timer size={18} />
              <span>{formatClock(app.remaining)}</span>
            </NavLink>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              localStorage.setItem("ff.sidebar.collapsed", String(!collapsed));
            }}
            aria-label="Replier la barre latérale"
          >
            <ChevronLeft />
            <span>Replier</span>
          </button>
        </aside>
        <div className="workspace">
          <div className="utility-bar">
            <button className="search-button" onClick={() => setPalette(true)}>
              <Search size={16} />
              <span>Rechercher ou lancer une commande…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <select
              aria-label="Thème"
              value={app.settings.theme}
              onChange={(e) =>
                safely(
                  app.mutate("settings", "PATCH", { theme: e.target.value }),
                )
              }
            >
              <option value="LIGHT">Clair</option>
              <option value="DARK">Sombre</option>
              <option value="SYSTEM">Système</option>
            </select>
          </div>
          {app.offline && (
            <div className="error" role="status">
              Backend indisponible. Le minuteur affiché continue ; les actions
              nécessitent le serveur.
            </div>
          )}
          <main id="main" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="matrix" element={<MatrixPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="focus" element={<FocusPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="archives" element={<ArchivesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={
                  <p>
                    Page introuvable.{" "}
                    <NavLink to="/">Revenir au tableau de bord</NavLink>
                  </p>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {nav.slice(0, 4).map(([path, label, Icon]) => (
          <NavLink key={path} to={path} end={path === "/"}>
            <Icon size={20} />
            <span>{label.split(" ")[0]}</span>
          </NavLink>
        ))}
        <button onClick={() => setMore(!more)}>
          <Menu size={20} />
          Plus
        </button>
      </nav>
      {more && (
        <Modal title="Navigation" close={() => setMore(false)}>
          {nav.slice(4).map(([path, label]) => (
            <button
              className="nav-choice"
              key={path}
              onClick={() => {
                navigate(path);
                setMore(false);
              }}
            >
              {label}
            </button>
          ))}
          <NewTask />
        </Modal>
      )}
      {palette && <Palette close={() => setPalette(false)} />}
      {(app.message || app.error) && (
        <div
          className={`toast ${app.error ? "error" : ""}`}
          role={app.error ? "alert" : "status"}
        >
          {app.error || app.message}
          {app.undo && (
            <button onClick={() => safely(app.undo!())}>Annuler</button>
          )}
          <button
            aria-label="Fermer la notification"
            onClick={() => {
              app.setMessage("");
              app.setError("");
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 10000, refetchOnWindowFocus: true } },
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Provider>
          <TaskProvider>
            <Shell />
          </TaskProvider>
        </Provider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

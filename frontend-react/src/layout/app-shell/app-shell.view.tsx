import { ChevronLeft, Menu, Search, Target, Timer } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import { formatClock } from "../../../../shared/time";
import { nav } from "../../app/navigation/navigation";
import { safely } from "../../core/utils/safely";
import { ArchivesPage } from "../../features/archives/pages/archives/archives-page";
import { CalendarPage } from "../../features/calendar/pages/calendar/calendar-page";
import { DashboardPage } from "../../features/dashboard/pages/dashboard/dashboard-page";
import { MatrixPage } from "../../features/eisenhower/pages/matrix/matrix-page";
import { FocusPage } from "../../features/pomodoro/pages/focus/focus-page";
import { ProjectsPage } from "../../features/projects/pages/projects/projects-page";
import { SettingsPage } from "../../features/settings/pages/settings/settings-page";
import { StatisticsPage } from "../../features/statistics/pages/statistics/statistics-page";
import { NewTask } from "../../features/tasks/components/new-task-button/new-task-button";
import { TasksPage } from "../../features/tasks/pages/tasks/tasks-page";
import { Modal } from "../../shared/ui/modal/modal";
import { Palette } from "../command-palette/command-palette";
import type { useShell } from "./use-app-shell";
export function ShellView({
  app,
  navigate,
  collapsed,
  setCollapsed,
  palette,
  setPalette,
  more,
  setMore,
}: ReturnType<typeof useShell>) {
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

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { X, Inbox } from "lucide-react";
import { useApp } from "./state";
import type { Quadrant } from "../../shared/models";
export function qstyle(q: Quadrant): CSSProperties {
  return {
    "--qc": `var(--${q.toLowerCase()})`,
    "--qa": `var(--${q.toLowerCase()}-accent)`,
    "--qs": `var(--${q.toLowerCase()}-soft)`,
    "--ql": `var(--${q.toLowerCase()}-line)`,
  } as CSSProperties;
}
export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { error } = useApp();
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => before?.focus();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Fermer" onClick={close}>
          <X />
        </button>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {children}
    </dialog>
  );
}
export function Empty({
  text = "Aucune tâche pour le moment.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Inbox />
      <p>{text}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="card loading" role="status">
      Chargement…
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: Error | null;
  retry: () => unknown;
}) {
  return error ? (
    <div className="error" role="alert">
      {error.message}
      <button onClick={retry}>Réessayer</button>
    </div>
  ) : null;
}
export function Progress({
  value,
  label = "Progression",
}: {
  value: number;
  label?: string;
}) {
  return (
    <progress
      aria-label={label}
      max={100}
      value={Math.min(100, Math.max(0, value))}
    />
  );
}
export function Header({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <h1>
        <span className="page-icon">{icon}</span>
        {title}
      </h1>
      <div className="actions">{children}</div>
    </header>
  );
}

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useApp } from "../../../core/state/use-app";

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

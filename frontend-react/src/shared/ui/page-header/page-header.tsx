import type { ReactNode } from "react";

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

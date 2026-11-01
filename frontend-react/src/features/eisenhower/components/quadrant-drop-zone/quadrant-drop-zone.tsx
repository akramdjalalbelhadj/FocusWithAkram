import { useDroppable } from "@dnd-kit/react";
import type { ReactNode } from "react";

export function Drop({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { ref, isDropTarget } = useDroppable({ id });
  return (
    <div
      ref={ref}
      className={`${className} ${isDropTarget ? "drop-target" : ""}`}
    >
      {children}
    </div>
  );
}

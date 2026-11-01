import { useDraggable } from "@dnd-kit/react";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import type { Task } from "../../../../../../shared/models";

export function DragTask({
  task,
  children,
}: {
  task: Task;
  children: ReactNode;
}) {
  const { ref, handleRef } = useDraggable({ id: task.id });
  return (
    <div ref={ref} className="draggable">
      <button
        ref={handleRef}
        className="drag-handle"
        aria-label={`Déplacer ${task.title}`}
      >
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}

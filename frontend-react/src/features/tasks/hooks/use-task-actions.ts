import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../../../../shared/models";
import { useApp } from "../../../core/state/use-app";
import type { Editor } from "../types/task-editor";

export function useActions() {
  const app = useApp(),
    navigate = useNavigate();
  const [editor, setEditor] = useState<Editor | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [completion, setCompletion] = useState<Task | null>(null),
    [deletion, setDeletion] = useState<Task | null>(null);
  async function complete(t: Task) {
    if (!t.actualStartAt) {
      setCompletion(t);
      return;
    }
    await app.mutate(`tasks/${t.id}/complete`);
  }
  async function focus(t: Task) {
    await app.sessionAction("start", "WORK", t.id);
    navigate("/focus");
  }
  return {
    editor,
    setEditor,
    detail,
    setDetail,
    completion,
    setCompletion,
    deletion,
    setDeletion,
    complete,
    focus,
  };
}

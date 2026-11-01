import { ShellView } from "./app-shell.view";
import { useShell } from "./use-app-shell";

export function Shell() {
  return <ShellView {...useShell()} />;
}

import { ArchivesPageView } from "./archives-page.view";
import { useArchivesPage } from "./use-archives-page";

export function ArchivesPage() {
  return <ArchivesPageView {...useArchivesPage()} />;
}

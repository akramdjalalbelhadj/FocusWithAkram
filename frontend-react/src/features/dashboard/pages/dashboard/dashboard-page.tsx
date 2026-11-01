import { DashboardPageView } from "./dashboard-page.view";
import { useDashboardPage } from "./use-dashboard-page";

export function DashboardPage() {
  return <DashboardPageView {...useDashboardPage()} />;
}

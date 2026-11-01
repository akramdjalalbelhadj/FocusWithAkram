import { SettingsPageView } from "./settings-page.view";
import { useSettingsPage } from "./use-settings-page";

export function SettingsPage() {
  return <SettingsPageView {...useSettingsPage()} />;
}

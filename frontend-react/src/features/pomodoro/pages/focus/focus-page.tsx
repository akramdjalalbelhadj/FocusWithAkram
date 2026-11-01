import { FocusPageView } from "./focus-page.view";
import { useFocusPage } from "./use-focus-page";

export function FocusPage() {
  return <FocusPageView {...useFocusPage()} />;
}

import { MatrixPageView } from "./matrix-page.view";
import { useMatrixPage } from "./use-matrix-page";

export function MatrixPage() {
  return <MatrixPageView {...useMatrixPage()} />;
}

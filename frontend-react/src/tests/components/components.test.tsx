import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Ring } from "../../features/pomodoro/components/timer-ring/timer-ring";
import { ErrorBox } from "../../shared/ui/error-box/error-box";
import { Progress } from "../../shared/ui/progress/progress";

it("rend le temps réel de session et le rôle timer", () => {
  const html = renderToStaticMarkup(<Ring seconds={1477} progress={0.5} />);
  expect(html).toContain("24:37");
  expect(html).toContain('role="timer"');
  expect(html).not.toContain("NaN");
});

it("borne une progression et expose un libellé accessible", () => {
  const html = renderToStaticMarkup(
    <Progress value={120} label="Objectif quotidien" />,
  );
  expect(html).toContain('value="100"');
  expect(html).toContain('aria-label="Objectif quotidien"');
});

it("expose les erreurs serveur avec une action de reprise", () => {
  const html = renderToStaticMarkup(
    <ErrorBox error={new Error("TASK_ALREADY_COMPLETED")} retry={() => {}} />,
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("TASK_ALREADY_COMPLETED");
  expect(html).toContain("Réessayer");
});

import { describe, it, expect } from "vitest";
import {
  localToInstant,
  startOfDayInstant,
  addDays,
  formatDay,
} from "../../shared/time";
import { remainingSeconds } from "../../shared/timer";
import type { PomodoroSession } from "../../shared/models";
import { query } from "./api";
describe("dates dans le fuseau configuré", () => {
  it("préserve une journée de 23 heures au passage été", () =>
    expect(
      (Date.parse(startOfDayInstant("2026-03-30", "Europe/Paris")) -
        Date.parse(startOfDayInstant("2026-03-29", "Europe/Paris"))) /
        3600000,
    ).toBe(23));
  it("préserve une journée de 25 heures au passage hiver", () =>
    expect(
      (Date.parse(startOfDayInstant("2026-10-26", "Europe/Paris")) -
        Date.parse(startOfDayInstant("2026-10-25", "Europe/Paris"))) /
        3600000,
    ).toBe(25));
  it("choisit la seconde occurrence de 02:30", () =>
    expect(localToInstant("2026-10-25 02:30", "Europe/Paris")).toBe(
      "2026-10-25T01:30:00.000Z",
    ));
  it("passe au mois suivant sans dépendre du fuseau navigateur", () =>
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01"));
  it("groupe dans la journée locale", () =>
    expect(formatDay("2026-10-31T23:30:00Z", "Europe/Paris")).toBe(
      "2026-11-01",
    ));
});
describe("horloge serveur et filtres", () => {
  const session = {
    status: "RUNNING",
    expectedEndAt: "2026-11-01T10:25:00Z",
    remainingSeconds: 1500,
  } as PomodoroSession;
  it("corrige un décalage de l’horloge locale", () =>
    expect(
      remainingSeconds(session, Date.parse("2026-11-01T10:00:00Z"), 60000),
    ).toBe(1440));
  it("ne compte pas les pauses", () =>
    expect(
      remainingSeconds(
        { ...session, status: "PAUSED", remainingSeconds: 42 },
        Date.now(),
        0,
      ),
    ).toBe(42));
  it("ne devient jamais négatif après une veille", () =>
    expect(
      remainingSeconds(session, Date.parse("2026-11-02T00:00:00Z"), 0),
    ).toBe(0));
  it("préserve les valeurs false et encode les étiquettes", () =>
    expect(query({ tag: "R&D", overdue: false, q: "", size: 200 })).toBe(
      "tag=R%26D&overdue=false&size=200",
    ));
});

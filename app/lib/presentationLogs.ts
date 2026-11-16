import type { RobotStatusLogEntry } from "./robotStatus";

/**
 * Mock status log shown on the /show presentation page. It lives in this browser's localStorage only:
 * nothing is written to the database. The main route's "Generate logs" form writes it, /show reads it.
 */
export const PRESENTATION_LOGS_KEY = "robot-presentation-logs-v2";

export function readPresentationLogs(): RobotStatusLogEntry[] | null {
  try {
    const saved = localStorage.getItem(PRESENTATION_LOGS_KEY);
    return saved ? (JSON.parse(saved) as RobotStatusLogEntry[]) : null;
  } catch {
    return null;
  }
}

export function writePresentationLogs(logs: RobotStatusLogEntry[]) {
  try {
    localStorage.setItem(PRESENTATION_LOGS_KEY, JSON.stringify(logs));
  } catch {
    /* storage blocked or full: the presentation just won't see the change */
  }
}

/**
 * A "Generate logs" run: the robots switched on in the form and the time the run starts. On /show every
 * robot of a run is shown as ON from its start time on, so the room lights up as the logs begin.
 */
export type PresentationRun = { start: number; robotIds: string[] };
export const PRESENTATION_RUNS_KEY = "robot-presentation-runs-v1";

export function readPresentationRuns(): PresentationRun[] {
  try {
    const saved = localStorage.getItem(PRESENTATION_RUNS_KEY);
    return saved ? (JSON.parse(saved) as PresentationRun[]) : [];
  } catch {
    return [];
  }
}

export function writePresentationRuns(runs: PresentationRun[]) {
  try {
    localStorage.setItem(PRESENTATION_RUNS_KEY, JSON.stringify(runs));
  } catch {
    /* storage blocked or full */
  }
}

/** Whether /show also lists the real (live) logs among the mock ones. On by default. */
export const PRESENTATION_MIX_KEY = "robot-presentation-mix-v1";

export function readPresentationMix(): boolean {
  try {
    return localStorage.getItem(PRESENTATION_MIX_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writePresentationMix(mix: boolean) {
  try {
    localStorage.setItem(PRESENTATION_MIX_KEY, mix ? "1" : "0");
  } catch {
    /* storage blocked or full */
  }
}

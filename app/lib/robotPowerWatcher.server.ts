import "server-only";
import { powerOffStaleRobots } from "./robots.server";
import { syncAllRobotStatuses } from "./robotStatus.server";

const LOG_CHECK_EVERY_MS = 10_000;
const POWER_CHECK_EVERY_MS = 60_000;

/** Runs `task` every `ms`, skipping a tick if the previous run is still going. Unref'd so it never keeps the process alive. */
function every(ms: number, label: string, task: () => Promise<void>): NodeJS.Timeout {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (err) {
      console.error(`[${label}] check failed`, err);
    } finally {
      running = false;
    }
  }, ms);
  timer.unref();
  return timer;
}

/**
 * Starts the two background checks, at most once per process:
 *  - every 10 s: read the status log: a PASS result sets a robot to PASS, repeated FAILs set MAINTAIN
 *  - every 60 s: switch off robots whose updatedAt is over a minute old
 */
export function startRobotPowerWatcher() {
  const g = globalThis as { __robotWatchers?: NodeJS.Timeout[] };
  if (g.__robotWatchers) return;
  console.log("[robot-watch] started (status log every 10 s, power every 60 s)");
  g.__robotWatchers = [
    every(LOG_CHECK_EVERY_MS, "robot-status", async () => {
      const { PASS, MAINTAIN } = await syncAllRobotStatuses();
      if (PASS) console.log(`[robot-status] ${PASS} robot(s) set to PASS after a PASS result`);
      if (MAINTAIN) console.log(`[robot-status] ${MAINTAIN} robot(s) moved to MAINTAIN after repeated FAILs`);
    }),
    every(POWER_CHECK_EVERY_MS, "robot-power", async () => {
      const { poweredOff } = await powerOffStaleRobots();
      if (poweredOff) console.log(`[robot-power] switched off ${poweredOff} inactive robot(s)`);
    }),
  ];
}

/** Runs once when the server starts: begins the periodic robot power check. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startRobotPowerWatcher } = await import("./app/lib/robotPowerWatcher.server");
  startRobotPowerWatcher();
}

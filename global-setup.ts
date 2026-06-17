
import {rimraf} from "rimraf";

/**
 * Global setup hook to clean up temporary directories before tests run.
 */
async function globalSetup() {
  // Resolve the target directory relative to the script's location
  await rimraf(["temp"]);
}

export default globalSetup;
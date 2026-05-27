import { config } from "./config.js";
import { closeDb } from "./db.js";
import { leaseJobs, processJob } from "./queue.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sendDelayMs = Math.ceil(1000 / config.SEND_RATE_PER_SECOND);

let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

async function run() {
  while (!stopping) {
    const jobs = await leaseJobs();

    if (jobs.length === 0) {
      await delay(config.WORKER_POLL_MS);
      continue;
    }

    for (const job of jobs) {
      if (stopping) break;
      await processJob(job);
      await delay(sendDelayMs);
    }
  }

  await closeDb();
}

run().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});

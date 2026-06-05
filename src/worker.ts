import { config } from "./config.js";
import { closeDb } from "./db.js";
import { reactEmailTemplates } from "./emailTemplates/registry.js";
import { leaseJobs, processJob } from "./queue.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sendDelayMs = Math.ceil(1000 / config.SEND_RATE_PER_SECOND);

let stopping = false;
let shutdownLogged = false;

process.on("SIGINT", () => {
  stopping = true;
  logShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  stopping = true;
  logShutdown("SIGTERM");
});

async function run() {
  console.log(
    JSON.stringify({
      event: "worker_started",
      pid: process.pid,
      workerBatchSize: config.WORKER_BATCH_SIZE,
      workerPollMs: config.WORKER_POLL_MS,
      sendRatePerSecond: config.SEND_RATE_PER_SECOND,
      templateCount: Object.keys(reactEmailTemplates).length,
      hasTrialRecapture: Boolean(reactEmailTemplates["trial-recapture"])
    })
  );

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

function logShutdown(signal: string) {
  if (shutdownLogged) return;
  shutdownLogged = true;
  console.log(JSON.stringify({ event: "worker_stopping", pid: process.pid, signal }));
}

run().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});

import { existsSync, readFileSync, readdirSync } from "node:fs";

type WorkerProcess = {
  pid: number;
  ppid: number | null;
  command: string;
};

const procPath = "/proc";

if (!existsSync(procPath)) {
  console.error("check-worker-processes only supports Linux /proc environments.");
  process.exit(2);
}

const currentPid = process.pid;
const workers: WorkerProcess[] = [];

for (const entry of readdirSync(procPath)) {
  if (!/^\d+$/.test(entry)) continue;

  const pid = Number(entry);
  if (pid === currentPid) continue;

  const cmdlinePath = `${procPath}/${entry}/cmdline`;
  const statusPath = `${procPath}/${entry}/status`;

  try {
    const command = readFileSync(cmdlinePath, "utf8").replace(/\0/g, " ").trim();
    if (!command.includes("dist/src/worker.js")) continue;

    const status = readFileSync(statusPath, "utf8");
    const ppidMatch = status.match(/^PPid:\s+(\d+)$/m);
    workers.push({
      pid,
      ppid: ppidMatch ? Number(ppidMatch[1]) : null,
      command
    });
  } catch {
    // Processes can exit while /proc is being scanned.
  }
}

workers.sort((a, b) => a.pid - b.pid);

for (const worker of workers) {
  console.log(`${worker.pid} ppid=${worker.ppid ?? "unknown"} ${worker.command}`);
}

if (workers.length !== 1) {
  console.error(`Expected exactly one dist/src/worker.js process, found ${workers.length}.`);
  process.exit(1);
}

console.log("Exactly one worker process is running.");

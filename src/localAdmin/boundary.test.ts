import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local admin server is loopback-only and does not import sending or worker modules", async () => {
  const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
  const routes = await readFile(new URL("./routes.ts", import.meta.url), "utf8");

  assert.match(server, /listen\(config\.LOCAL_ADMIN_PORT, "127\.0\.0\.1"/);
  assert.doesNotMatch(`${server}\n${routes}`, /from ["']\.\.\/(mailer|queue|worker)\.js["']/);
  assert.match(routes, /\/api\/manual\/send/);
});

import express from "express";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { localAdminRouter } from "./routes.js";

const app = express();
const publicDir = fileURLToPath(new URL("./public", import.meta.url));

app.use(express.json({ limit: "3mb" }));
app.use(localAdminRouter);
app.use(express.static(publicDir));

app.listen(config.LOCAL_ADMIN_PORT, "127.0.0.1", () => {
  console.log(`Agulhada Mail local admin listening on http://127.0.0.1:${config.LOCAL_ADMIN_PORT}`);
});

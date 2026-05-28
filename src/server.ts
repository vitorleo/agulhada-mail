import express from "express";
import { config } from "./config.js";
import { router } from "./routes.js";

const app = express();

app.use(express.json({ limit: "2mb", type: ["application/json", "text/plain"] }));
app.use(express.urlencoded({ extended: false }));
app.use(router);

app.listen(config.PORT, () => {
  console.log(`Agulhada Mail API listening on http://localhost:${config.PORT}`);
});

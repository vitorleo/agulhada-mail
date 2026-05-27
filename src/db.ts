import { MongoClient, type Db } from "mongodb";
import { config } from "./config.js";

let client: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  client = new MongoClient(config.MONGO_DATABASE_URL);
  await client.connect();
  cachedDb = client.db(config.MONGO_DATABASE_NAME);
  return cachedDb;
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = null;
  cachedDb = null;
}

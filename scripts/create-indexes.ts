import { getDb, closeDb } from "../src/db.js";

async function main() {
  const db = await getDb();

  await db.collection("subscribers").createIndex({ emailLower: 1 }, { unique: true });
  await db.collection("subscribers").createIndex({ status: 1 });
  await db.collection("subscribers").createIndex({ userId: 1 });
  await db.collection("subscribers").createIndex({ tags: 1 });

  await db.collection("lists").createIndex({ slug: 1 }, { unique: true });
  await db.collection("list_members").createIndex({ listId: 1, subscriberId: 1 }, { unique: true });
  await db.collection("list_members").createIndex({ subscriberId: 1, status: 1 });

  await db.collection("email_templates").createIndex({ slug: 1 }, { unique: true });
  await db.collection("email_templates").createIndex({ category: 1 });

  await db.collection("campaigns").createIndex({ status: 1, scheduledAt: 1 });
  await db.collection("email_jobs").createIndex({ status: 1, nextAttemptAt: 1 });
  await db.collection("email_jobs").createIndex({ campaignId: 1, subscriberId: 1 }, { unique: true, sparse: true });
  await db.collection("email_jobs").createIndex({ sesMessageId: 1 }, { sparse: true });

  await db.collection("email_events").createIndex({ sesMessageId: 1 });
  await db.collection("email_events").createIndex({ campaignId: 1, eventType: 1 });

  await db.collection("suppressions").createIndex({ emailLower: 1, scope: 1 }, { unique: true });
  await db.collection("suppressions").createIndex({ reason: 1 });

  console.log("Indexes created");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);

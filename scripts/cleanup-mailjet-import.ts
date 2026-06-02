import { closeDb, getDb } from "../src/db.js";

type CleanupOptions = {
  listSlug: string;
  write: boolean;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = await getDb();

  const list = await db.collection("lists").findOne({ slug: options.listSlug });
  const subscriberFilter = {
    $or: [
      { "custom.mailjet": { $exists: true } },
      { tags: "mailjet" },
      { source: "mailjet" }
    ]
  };
  const suppressionFilter = { source: "mailjet-import" };

  const listMembers = list
    ? await db.collection("list_members").countDocuments({ listId: list._id })
    : 0;
  const subscribers = await db.collection("subscribers").countDocuments(subscriberFilter);
  const suppressions = await db.collection("suppressions").countDocuments(suppressionFilter);

  console.log(options.write ? "Running Mailjet cleanup with writes enabled." : "Dry run only. Re-run with --write to delete.");
  console.log({
    listSlug: options.listSlug,
    listFound: Boolean(list),
    listMembers,
    subscribers,
    suppressions
  });

  if (!options.write) return;

  if (list) {
    const listMemberResult = await db.collection("list_members").deleteMany({ listId: list._id });
    const listResult = await db.collection("lists").deleteOne({ _id: list._id });
    console.log("Deleted list data", {
      listMembers: listMemberResult.deletedCount,
      lists: listResult.deletedCount
    });
  }

  const subscriberResult = await db.collection("subscribers").deleteMany(subscriberFilter);
  const suppressionResult = await db.collection("suppressions").deleteMany(suppressionFilter);

  console.log("Deleted Mailjet import data", {
    subscribers: subscriberResult.deletedCount,
    suppressions: suppressionResult.deletedCount
  });
}

function parseArgs(args: string[]): CleanupOptions {
  const values = new Map<string, string | true>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      values.set(key, true);
    } else {
      values.set(key, next);
      index++;
    }
  }

  return {
    listSlug: stringValue(values, "list-slug", "mailjet-all"),
    write: values.get("write") === true
  };
}

function stringValue(values: Map<string, string | true>, key: string, fallback: string): string {
  const value = values.get(key);
  return typeof value === "string" ? value : fallback;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);

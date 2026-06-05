import assert from "node:assert/strict";
import test from "node:test";
import { CsvPreparationStore, CsvValidationError, previewCsv } from "./csv.js";

test("CSV preview validates, trims, and deduplicates recipients", () => {
  const store = new CsvPreparationStore();
  const result = previewCsv([
    "email,firstName,name,source",
    " PERSON@example.com , Person ,Person Example, CST",
    "person@example.com,Duplicate,,",
    "invalid-email,Bad,,"
  ].join("\n"), store);

  assert.deepEqual(result.counts, { rows: 3, valid: 1, invalid: 1, duplicates: 1 });
  assert.equal(result.preview[0].email, "PERSON@example.com");
  assert.equal(store.consume(result.preparationId).length, 1);
  assert.throws(() => store.consume(result.preparationId), CsvValidationError);
});

test("CSV preview requires an email column", () => {
  assert.throws(() => previewCsv("name\nPerson"), /email column/);
});

test("CSV preparations expire", () => {
  let now = 100;
  const store = new CsvPreparationStore(10, () => now);
  const id = store.create([{ email: "person@example.com" }]);
  now = 111;
  assert.throws(() => store.consume(id), /expired/);
});

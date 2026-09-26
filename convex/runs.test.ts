import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("submitRun then topRuns returns fastest first", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(api.runs.submitRun, {
    initials: "ZZZ",
    durationMs: 90000,
    skipped: 0,
  });
  await t.mutation(api.runs.submitRun, {
    initials: "AAA",
    durationMs: 30000,
    skipped: 1,
  });

  const top = await t.query(api.runs.topRuns, {});
  expect(top.map((r) => r.initials)).toEqual(["AAA", "ZZZ"]);
});

test("submitRun rejects empty initials", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.runs.submitRun, {
      initials: "!!!",
      durationMs: 1000,
      skipped: 0,
    }),
  ).rejects.toThrow();
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  runs: defineTable({
    initials: v.string(),
    durationMs: v.number(),
    skipped: v.number(),
  }).index('by_durationMs', ['durationMs']),
});

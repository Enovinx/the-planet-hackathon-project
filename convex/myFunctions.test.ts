/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("addNumber then listNumbers returns numbers in insertion order", async () => {
  const t = convexTest(schema, modules);

  const initial = await t.query(api.myFunctions.listNumbers, { count: 10 });
  expect(initial.numbers).toEqual([]);

  await t.mutation(api.myFunctions.addNumber, { value: 4 });
  await t.mutation(api.myFunctions.addNumber, { value: 7 });

  const result = await t.query(api.myFunctions.listNumbers, { count: 10 });
  expect(result.numbers).toEqual([4, 7]);
});

test("listNumbers respects the count argument and returns most recent", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(api.myFunctions.addNumber, { value: 1 });
  await t.mutation(api.myFunctions.addNumber, { value: 2 });
  await t.mutation(api.myFunctions.addNumber, { value: 3 });

  const result = await t.query(api.myFunctions.listNumbers, { count: 2 });
  expect(result.numbers).toEqual([2, 3]);
});

test("viewer is null when unauthenticated", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(api.myFunctions.listNumbers, { count: 10 });
  expect(result.viewer).toBeNull();
});

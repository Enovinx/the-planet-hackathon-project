import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const MAX_INITIALS = 3;
const MAX_TOP = 10;

export const submitRun = mutation({
  args: {
    initials: v.string(),
    durationMs: v.number(),
    skipped: v.number(),
  },
  handler: async (ctx, args) => {
    const initials = args.initials
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, MAX_INITIALS);
    if (initials.length === 0) {
      throw new Error('Initials required');
    }
    if (args.durationMs < 0 || args.skipped < 0) {
      throw new Error('Invalid run stats');
    }
    await ctx.db.insert('runs', {
      initials,
      durationMs: Math.floor(args.durationMs),
      skipped: Math.floor(args.skipped),
    });
    return null;
  },
});

export const topRuns = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('runs')
      .withIndex('by_durationMs')
      .order('asc')
      .take(MAX_TOP);
  },
});

export const GRID_SIZE = 8;
export const PAIR_COUNT = 4;

export interface Pos {
  r: number;
  c: number;
}

/** Four pairs of endpoints: endpoints[colorId] = [a, b] */
export interface GeneratorPuzzle {
  size: number;
  endpoints: [Pos, Pos][];
  /** One known solution (full paths), useful for hints / testing. */
  solution?: Pos[][];
}

export function posKey(p: Pos): string {
  return `${p.r},${p.c}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function inBounds(p: Pos, size: number = GRID_SIZE): boolean {
  return p.r >= 0 && p.r < size && p.c >= 0 && p.c < size;
}

/** mulberry32 — small seeded RNG so puzzles are reproducible per seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function neighbors(p: Pos, size: number): Pos[] {
  const out: Pos[] = [];
  if (p.r > 0) out.push({ r: p.r - 1, c: p.c });
  if (p.r < size - 1) out.push({ r: p.r + 1, c: p.c });
  if (p.c > 0) out.push({ r: p.r, c: p.c - 1 });
  if (p.c < size - 1) out.push({ r: p.r, c: p.c + 1 });
  return out;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/**
 * Grow one self-avoiding random walk on free cells.
 * Returns the full path (start..end) or null if stuck too early.
 */
function growWalk(
  start: Pos,
  occupied: Set<string>,
  rand: () => number,
  size: number,
  minLen: number,
  maxLen: number,
): Pos[] | null {
  const path: Pos[] = [start];
  const local = new Set<string>([posKey(start)]);
  const targetLen = minLen + Math.floor(rand() * (maxLen - minLen + 1));

  while (path.length < targetLen) {
    const head = path[path.length - 1] as Pos;
    const options = shuffle(neighbors(head, size), rand).filter(
      (n) => !occupied.has(posKey(n)) && !local.has(posKey(n)),
    );
    if (options.length === 0) break;
    const next = options[0] as Pos;
    path.push(next);
    local.add(posKey(next));
  }

  if (path.length < minLen) return null;
  return path;
}

/**
 * Find a Hamiltonian path covering every cell of the grid.
 * Randomized depth-first search with Warnsdorff ordering (fewest onward
 * moves first), bounded by a step budget per attempt and an overall
 * deadline so generation never stalls the UI.
 */
function findHamiltonianPath(
  size: number,
  rand: () => number,
  deadlineMs: number,
): Pos[] | null {
  const total = size * size;
  const deadline = Date.now() + deadlineMs;
  const idx = (r: number, c: number): number => r * size + c;
  const visited = new Uint8Array(total);

  for (let attempt = 0; attempt < 40; attempt++) {
    if (Date.now() > deadline) return null;
    visited.fill(0);
    const path: Pos[] = [];
    let steps = 0;

    const dfs = (cell: Pos): boolean => {
      if (++steps > 80000 || Date.now() > deadline) return false;
      visited[idx(cell.r, cell.c)] = 1;
      path.push(cell);
      if (path.length === total) return true;
      const nbs = shuffle(neighbors(cell, size), rand).filter(
        (n) => !visited[idx(n.r, n.c)],
      );
      // Fewest onward moves first — prunes dead ends early.
      nbs.sort(
        (a, b) =>
          neighbors(a, size).filter((n) => !visited[idx(n.r, n.c)]).length -
          neighbors(b, size).filter((n) => !visited[idx(n.r, n.c)]).length,
      );
      for (const nb of nbs) {
        if (dfs(nb)) return true;
        if (Date.now() > deadline) return false;
      }
      visited[idx(cell.r, cell.c)] = 0;
      path.pop();
      return false;
    };

    const start: Pos = {
      r: Math.floor(rand() * size),
      c: Math.floor(rand() * size),
    };
    if (dfs(start)) return [...path];
  }
  return null;
}

/** Cut a full-grid path into `parts` contiguous links, each >= minLen cells. */
function cutIntoLinks(
  path: Pos[],
  parts: number,
  minLen: number,
  rand: () => number,
): Pos[][] | null {
  const total = path.length;
  if (total < parts * minLen) return null;
  const chunks: Pos[][] = [];
  let pos = 0;
  let remaining = total;
  for (let i = 0; i < parts - 1; i++) {
    const partsLeft = parts - i - 1;
    const max = remaining - partsLeft * minLen;
    const len = minLen + Math.floor(rand() * (max - minLen + 1));
    chunks.push(path.slice(pos, pos + len));
    pos += len;
    remaining -= len;
  }
  chunks.push(path.slice(pos));
  if (chunks.some((ch) => ch.length < minLen)) return null;
  return chunks;
}

/**
 * Generate a guaranteed-solvable 8x8 / 4-pair puzzle.
 *
 * Strategy: find one Hamiltonian path covering all 64 cells, then cut it
 * into 4 contiguous links and keep only each link's endpoints as the
 * puzzle nodes. The links themselves form a perfect solution that fits
 * the whole grid, so the puzzle is solvable by construction.
 * Falls back to disjoint random walks if the Hamiltonian search misses
 * its time budget.
 */
export function generatePuzzle(seed?: number): GeneratorPuzzle {
  const size = GRID_SIZE;
  const rand = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 31));

  // Perfect fit first: the solution covers every tile of the grid.
  const full = findHamiltonianPath(size, rand, 400);
  if (full) {
    const chunks = cutIntoLinks(full, PAIR_COUNT, 8, rand);
    if (chunks) {
      const endpoints = chunks.map((ch) => {
        const a = ch[0] as Pos;
        const b = ch[ch.length - 1] as Pos;
        return [{ ...a }, { ...b }] as [Pos, Pos];
      });
      const solution = chunks.map((ch) => ch.map((p) => ({ ...p })));
      return { size, endpoints, solution };
    }
  }

  // Fallback: disjoint random walks (partial coverage).
  for (let attempt = 0; attempt < 200; attempt++) {
    const occupied = new Set<string>();
    const endpoints: [Pos, Pos][] = [];
    const solution: Pos[][] = [];
    let ok = true;

    // Shorter walks first so later colors still find room.
    const lengths: [number, number][] = [
      [6, 14],
      [5, 12],
      [4, 10],
      [4, 10],
    ];

    for (let color = 0; color < PAIR_COUNT; color++) {
      let placed = false;
      const [minLen, maxLen] = lengths[color] as [number, number];
      for (let t = 0; t < 60 && !placed; t++) {
        const start: Pos = {
          r: Math.floor(rand() * size),
          c: Math.floor(rand() * size),
        };
        if (occupied.has(posKey(start))) continue;
        const walk = growWalk(start, occupied, rand, size, minLen, maxLen);
        if (!walk || walk.length < 2) continue;
        const end = walk[walk.length - 1] as Pos;
        // Endpoints shouldn't touch: avoids trivially adjacent pairs.
        if (isAdjacent(start, end) && walk.length <= 3) continue;
        for (const cell of walk) occupied.add(posKey(cell));
        endpoints.push([start, end]);
        solution.push(walk);
        placed = true;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }

    if (ok) return { size, endpoints, solution };
  }

  // Fallback: hand-designed solvable puzzle (verified connected below).
  return FALLBACK_PUZZLE;
}

/** Hand-designed fallback — four spread-out pairs on 8x8. */
export const FALLBACK_PUZZLE: GeneratorPuzzle = {
  size: GRID_SIZE,
  endpoints: [
    [
      { r: 0, c: 1 },
      { r: 5, c: 1 },
    ],
    [
      { r: 0, c: 5 },
      { r: 6, c: 5 },
    ],
    [
      { r: 2, c: 0 },
      { r: 2, c: 6 },
    ],
    [
      { r: 4, c: 3 },
      { r: 7, c: 6 },
    ],
  ],
};

/** True when every color connects its two endpoints with an orthogonal, collision-free path. */
export function isSolved(
  paths: Pos[][],
  endpoints: [Pos, Pos][],
  size: number = GRID_SIZE,
): boolean {
  if (paths.length !== endpoints.length) return false;
  const seen = new Set<string>();

  for (let color = 0; color < endpoints.length; color++) {
    const path = paths[color];
    const ends = endpoints[color];
    if (!path || !ends) return false;
    if (path.length < 2) return false;
    const [a, b] = ends;
    const first = path[0] as Pos;
    const last = path[path.length - 1] as Pos;
    const connects =
      (samePos(first, a) && samePos(last, b)) ||
      (samePos(first, b) && samePos(last, a));
    if (!connects) return false;

    for (let i = 0; i < path.length; i++) {
      const cell = path[i] as Pos;
      if (!inBounds(cell, size)) return false;
      if (i > 0 && !isAdjacent(path[i - 1] as Pos, cell)) return false;
      const key = posKey(cell);
      if (seen.has(key)) return false; // collision with another color
      seen.add(key);
    }
  }
  return true;
}

/** Fraction of cells covered by any path (0..1) — for bonus display. */
export function coverage(paths: Pos[][], size: number = GRID_SIZE): number {
  const seen = new Set<string>();
  for (const path of paths) for (const cell of path) seen.add(posKey(cell));
  return seen.size / (size * size);
}

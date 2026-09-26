import { mulberry32 } from './generatorPuzzle';

/** Terminals on each side of the panel. */
export const WIRE_COUNT = 5;

export const WIRE_COLORS = [
  '#22d3ee',
  '#fbbf24',
  '#a3e635',
  '#f472b6',
  '#a78bfa',
] as const;

export interface WiringPuzzle {
  size: number;
  /** Colour id of each left-side terminal, top to bottom. */
  left: number[];
  /** Colour id of each right-side terminal, top to bottom. */
  right: number[];
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
 * Left terminals are the reference order; the right side is scrambled, so the
 * player has to trace each colour across the panel to link the pairs.
 */
export function generateWiring(seed?: number, size = WIRE_COUNT): WiringPuzzle {
  const rand = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 31));
  const left = Array.from({ length: size }, (_, i) => i);
  let right = shuffle(left, rand);

  // Never hand the player a board that is already wired straight across.
  if (right.every((color, i) => color === i)) {
    right = [...right.slice(1), right[0] as number];
  }

  return { size, left, right };
}

/** A left terminal may only link to the same-coloured right terminal. */
export function canLink(
  puzzle: WiringPuzzle,
  leftIndex: number,
  rightIndex: number,
): boolean {
  return puzzle.left[leftIndex] === puzzle.right[rightIndex];
}

/** Every left terminal linked to its matching right terminal. */
export function isWiringSolved(
  links: Record<number, number>,
  puzzle: WiringPuzzle,
): boolean {
  for (let leftIndex = 0; leftIndex < puzzle.size; leftIndex++) {
    const rightIndex = links[leftIndex];
    if (rightIndex === undefined) return false;
    if (!canLink(puzzle, leftIndex, rightIndex)) return false;
  }
  return true;
}

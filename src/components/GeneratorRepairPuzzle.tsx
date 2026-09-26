import * as React from 'react';
import {
  GRID_SIZE,
  PAIR_COUNT,
  generatePuzzle,
  isAdjacent,
  isSolved,
  samePos,
  type GeneratorPuzzle,
  type Pos,
} from '~/lib/generatorPuzzle';
import { playSfx } from '~/lib/sfx';

interface PairStyle {
  main: string;
  soft: string;
}

export const PAIR_STYLES: PairStyle[] = [
  { main: '#22d3ee', soft: 'rgba(34,211,238,0.22)' },
  { main: '#fbbf24', soft: 'rgba(251,191,36,0.22)' },
  { main: '#a3e635', soft: 'rgba(163,230,53,0.22)' },
  { main: '#f472b6', soft: 'rgba(244,114,182,0.22)' },
];

const BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

interface Props {
  seed?: number;
  onSolved?: () => void;
}

function emptyPaths(): Pos[][] {
  return Array.from({ length: PAIR_COUNT }, () => []);
}

function emptyLocks(): boolean[] {
  return Array.from({ length: PAIR_COUNT }, () => false);
}

function endpointAt(puzzle: GeneratorPuzzle, cell: Pos): number | null {
  for (let color = 0; color < puzzle.endpoints.length; color++) {
    const ends = puzzle.endpoints[color];
    if (!ends) continue;
    if (samePos(ends[0], cell) || samePos(ends[1], cell)) return color;
  }
  return null;
}

function twinOf(
  puzzle: GeneratorPuzzle,
  color: number,
  path: Pos[],
): Pos | null {
  const ends = puzzle.endpoints[color];
  const start = path[0];
  if (!ends || !start) return null;
  if (samePos(start, ends[0])) return ends[1];
  if (samePos(start, ends[1])) return ends[0];
  return null;
}

function pathD(path: Pos[]): string {
  return path.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.c + 0.5} ${p.r + 0.5}`).join(' ');
}

export default function GeneratorRepairPuzzle({ seed, onSolved }: Props) {
  const [puzzle, setPuzzle] = React.useState<GeneratorPuzzle>(() =>
    generatePuzzle(seed),
  );
  const [paths, setPaths] = React.useState<Pos[][]>(emptyPaths);
  const [locked, setLocked] = React.useState<boolean[]>(emptyLocks);
  const [active, setActive] = React.useState<number | null>(null);
  const [solved, setSolved] = React.useState(false);
  const [puzzleId, setPuzzleId] = React.useState(0);
  const drawingRef = React.useRef(false);
  const glowRef = React.useRef<HTMLDivElement>(null);
  const springRef = React.useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const targetRef = React.useRef<{ x: number; y: number; color: string } | null>(
    null,
  );

  React.useEffect(() => {
    setPuzzle(generatePuzzle(seed));
    setPaths(emptyPaths());
    setLocked(emptyLocks());
    setActive(null);
    setSolved(false);
    setPuzzleId((n) => n + 1);
  }, [seed]);

  React.useEffect(() => {
    if (!solved && isSolved(paths, puzzle.endpoints, puzzle.size)) {
      setSolved(true);
      playSfx('solved');
      onSolved?.();
    }
  }, [paths, puzzle, solved, onSolved]);

  // Spring-physics drag head: lerps toward the active tip with a bounce.
  React.useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const s = springRef.current;
      const t = targetRef.current;
      const el = glowRef.current;
      if (t && el) {
        const k = 170;
        const c = 13;
        const h = dt / 2;
        for (let i = 0; i < 2; i++) {
          s.vx += (k * (t.x - s.x) - c * s.vx) * h;
          s.vy += (k * (t.y - s.y) - c * s.vy) * h;
          s.x += s.vx * h;
          s.y += s.vy * h;
        }
        el.style.opacity = '1';
        el.style.transform = `translate(${s.x * 100}%, ${s.y * 100}%) scale(1)`;
        el.style.background = t.color;
      } else if (el) {
        el.style.opacity = '0';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keep the spring target glued to the active tip.
  React.useEffect(() => {
    if (active === null) {
      targetRef.current = null;
      return;
    }
    const path = paths[active] ?? [];
    const tip = path[path.length - 1];
    if (!tip) {
      targetRef.current = null;
      return;
    }
    targetRef.current = {
      x: tip.c,
      y: tip.r,
      color: (PAIR_STYLES[active] as PairStyle).main,
    };
  }, [paths, active]);

  function cellFromPoint(clientX: number, clientY: number): Pos | null {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = (el as HTMLElement | null)?.closest?.('[data-r]');
    if (!cell) return null;
    const r = Number((cell as HTMLElement).dataset.r);
    const c = Number((cell as HTMLElement).dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return { r, c };
  }

  function snapSpringTo(cell: Pos): void {
    const s = springRef.current;
    s.x = cell.c;
    s.y = cell.r;
    s.vx = 0;
    s.vy = 0;
  }

  /** Press on a node to (re)start its link; pressing a locked node reopens it. */
  function grab(cell: Pos): void {
    const epColor = endpointAt(puzzle, cell);
    if (epColor !== null) {
      setLocked((prev) => {
        if (!prev[epColor]) return prev;
        const next = [...prev];
        next[epColor] = false;
        return next;
      });
      setPaths((prev) => {
        const next = prev.map((p) => [...p]);
        next[epColor] = [{ ...cell }];
        return next;
      });
      setActive(epColor);
      drawingRef.current = true;
      setSolved(false);
      snapSpringTo(cell);
      return;
    }
    // Re-grab an unlocked link mid-path to re-route it.
    for (let color = 0; color < paths.length; color++) {
      if (locked[color]) continue;
      const idx = paths[color]?.findIndex((p) => samePos(p, cell)) ?? -1;
      if (idx >= 0) {
        setPaths((prev) => {
          const next = prev.map((p) => [...p]);
          next[color] = (next[color] as Pos[]).slice(0, idx + 1);
          return next;
        });
        setActive(color);
        drawingRef.current = true;
        setSolved(false);
        snapSpringTo(cell);
        return;
      }
    }
  }

  /** Extend the active link one tile; reaching the twin snaps it locked. */
  function dragTo(cell: Pos): void {
    if (!drawingRef.current) return;
    const color = active;
    if (color === null || locked[color]) return;
    const current = paths[color] ?? [];
    if (current.length === 0) return;
    const last = current[current.length - 1] as Pos;
    if (samePos(last, cell)) return;
    if (!isAdjacent(last, cell)) return; // must drag through tiles

    // Own link loop-back → trim.
    const ownIdx = current.findIndex((p) => samePos(p, cell));
    if (ownIdx >= 0) {
      const trimmed = current.slice(0, ownIdx + 1);
      setPaths((prev) => {
        const next = prev.map((p) => [...p]);
        next[color] = trimmed.map((p) => ({ ...p }));
        return next;
      });
      return;
    }

    // Foreign node in the way → blocked.
    const otherEp = endpointAt(puzzle, cell);
    if (otherEp !== null && otherEp !== color) return;

    // Locked links can't be crossed or cut.
    for (let d = 0; d < paths.length; d++) {
      if (d === color || !locked[d]) continue;
      if ((paths[d] ?? []).some((p) => samePos(p, cell))) return;
    }

    // Reaching the twin snaps the link locked — no overshoot possible.
    const twin = twinOf(puzzle, color, current);
    if (twin && samePos(cell, twin)) {
      const finished = [...current.map((p) => ({ ...p })), { ...cell }];
      setPaths((prev) => {
        const next = prev.map((p) => [...p]);
        next[color] = finished;
        return next;
      });
      setLocked((prev) => {
        const next = [...prev];
        next[color] = true;
        return next;
      });
      drawingRef.current = false;
      setActive(null);
      playSfx('lock');
      return;
    }

    // Cut through rival (unlocked) links, then occupy the tile.
    setPaths((prev) => {
      const next = prev.map((p) => [...p]);
      for (let d = 0; d < next.length; d++) {
        if (d === color || locked[d]) continue;
        const idx = (next[d] as Pos[]).findIndex((p) => samePos(p, cell));
        if (idx >= 0) {
          next[d] = (next[d] as Pos[]).slice(0, idx);
        }
      }
      next[color] = [...current.map((p) => ({ ...p })), { ...cell }];
      return next;
    });
  }

  function release(): void {
    drawingRef.current = false;
    setActive(null);
  }

  function reset(): void {
    setPaths(emptyPaths());
    setLocked(emptyLocks());
    setActive(null);
    setSolved(false);
  }

  function newPuzzle(): void {
    setPuzzle(generatePuzzle());
    setPaths(emptyPaths());
    setLocked(emptyLocks());
    setActive(null);
    setSolved(false);
    setPuzzleId((n) => n + 1);
  }

  return (
    <div className="gr-anim w-full max-w-xl mx-auto flex flex-col gap-4 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" role="status">
          {PAIR_STYLES.map((s, i) => (
            <span
              key={`${puzzleId}-${i}-${locked[i] === true ? 'on' : 'off'}`}
              aria-label={locked[i] === true ? 'linked' : 'unlinked'}
              className={
                locked[i] === true
                  ? 'inline-block w-4 h-4 rounded-full animate-[gr-dot-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_backwards]'
                  : 'inline-block w-4 h-4 rounded-full transition-all duration-300'
              }
              style={{
                background: locked[i] === true ? s.main : 'transparent',
                border: `2px solid ${s.main}`,
                opacity: locked[i] === true ? 1 : 0.55,
              }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            aria-label="reset"
            className="w-9 h-9 flex items-center justify-center rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:scale-105 active:scale-90 transition-all duration-200"
            style={{ transitionTimingFunction: BOUNCE }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={newPuzzle}
            aria-label="new"
            className="w-9 h-9 flex items-center justify-center rounded bg-red-700 text-white hover:bg-red-600 hover:scale-105 active:scale-90 transition-all duration-200"
            style={{ transitionTimingFunction: BOUNCE }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className="relative rounded-xl border-2 bg-zinc-950 p-2 transition-colors duration-500"
          style={{ borderColor: solved ? '#a3e635' : 'rgb(63 63 70)' }}
        >
          <div
            key={puzzleId}
            className="relative aspect-square w-full grid touch-none rounded-lg overflow-hidden"
            style={{
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0,1fr))`,
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0,1fr))`,
            }}
            onPointerDown={(e) => {
              const cell = cellFromPoint(e.clientX, e.clientY);
              if (cell) {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                grab(cell);
              }
            }}
            onPointerMove={(e) => {
              if (!drawingRef.current) return;
              const cell = cellFromPoint(e.clientX, e.clientY);
              if (cell) dragTo(cell);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={release}
            onContextMenu={(e) => e.preventDefault()}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
              const r = Math.floor(i / GRID_SIZE);
              const c = i % GRID_SIZE;
              const key = `${r},${c}`;
              const ep = endpointAt(puzzle, { r, c });
              const inPath = paths.findIndex((p) =>
                p.some((cell) => cell.r === r && cell.c === c),
              );
              const style = PAIR_STYLES[ep ?? inPath];
              const epIndex =
                ep !== null &&
                puzzle.endpoints[ep]?.[0]?.r === r &&
                puzzle.endpoints[ep]?.[0]?.c === c
                  ? ep * 2
                  : (ep ?? 0) * 2 + 1;
              return (
                <div
                  key={key}
                  data-r={r}
                  data-c={c}
                  className="relative border border-zinc-800/80 bg-zinc-950 flex items-center justify-center transition-colors duration-150"
                  style={
                    inPath >= 0 && ep === null
                      ? { background: style?.soft }
                      : undefined
                  }
                >
                  {ep !== null && (
                    <span
                      className="w-[62%] h-[62%] rounded-full z-10 pointer-events-none animate-[gr-node-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_backwards] transition-transform duration-200"
                      style={{
                        background: (PAIR_STYLES[ep] as PairStyle).main,
                        border: '2px solid rgba(0,0,0,0.6)',
                        animationDelay: `${epIndex * 55}ms`,
                        transform:
                          locked[ep] === true ? 'scale(1.12)' : undefined,
                      }}
                    />
                  )}
                </div>
              );
            })}

            <svg
              viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              {paths.map((path, color) => {
                if (path.length < 2) return null;
                const main = (PAIR_STYLES[color] as PairStyle).main;
                const pts = path
                  .map((p) => `${p.c + 0.5},${p.r + 0.5}`)
                  .join(' ');
                return (
                  <g key={color}>
                    <polyline
                      points={pts}
                      fill="none"
                      stroke={main}
                      strokeWidth={0.3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.95}
                    />
                    {locked[color] === true && (
                      <circle r={0.17} fill={main} opacity={0.95}>
                        <animateMotion
                          dur={`${(1.1 + path.length * 0.07).toFixed(2)}s`}
                          repeatCount="indefinite"
                          path={pathD(path)}
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            <div
              ref={glowRef}
              aria-hidden="true"
              className="absolute top-0 left-0 w-[12.5%] h-[12.5%] rounded-full pointer-events-none opacity-0"
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="absolute inset-[22%] rounded-full bg-white/90" />
            </div>
          </div>

          {solved && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl">
              <div className="flex flex-col items-center gap-4 border-2 border-lime-400 bg-zinc-950 px-8 py-6 animate-[gr-overlay-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#a3e635"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="done"
                  role="img"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    strokeDasharray={32}
                    className="animate-[gr-check-draw_0.5s_ease-out_0.25s_backwards]"
                  />
                </svg>
                <button
                  type="button"
                  onClick={newPuzzle}
                  aria-label="next"
                  className="w-11 h-11 flex items-center justify-center rounded bg-lime-400 text-black hover:bg-lime-300 hover:scale-110 active:scale-90 transition-all duration-200"
                  style={{ transitionTimingFunction: BOUNCE }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

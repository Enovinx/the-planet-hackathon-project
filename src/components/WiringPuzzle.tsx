import * as React from 'react';
import {
  WIRE_COLORS,
  canLink,
  generateWiring,
  isWiringSolved,
  type WiringPuzzle,
} from '~/lib/wiringPuzzle';

interface Props {
  seed?: number;
  onSolved?: () => void;
}

type Side = 'left' | 'right';

interface Terminal {
  side: Side;
  index: number;
}

const LEFT_X = 8;
const RIGHT_X = 92;
const SOLVED_HOLD_MS = 1100;

function terminalY(index: number, size: number): number {
  return ((index + 0.5) / size) * 100;
}

function terminalColor(puzzle: WiringPuzzle, terminal: Terminal): string {
  const id =
    terminal.side === 'left'
      ? puzzle.left[terminal.index]
      : puzzle.right[terminal.index];
  return WIRE_COLORS[id] ?? WIRE_COLORS[0];
}

function terminalPosition(terminal: Terminal, size: number) {
  return {
    x: terminal.side === 'left' ? LEFT_X : RIGHT_X,
    y: terminalY(terminal.index, size),
  };
}

function wirePath(x1: number, y1: number, x2: number, y2: number): string {
  const bow = 26;
  return `M ${x1} ${y1} C ${x1 + bow} ${y1}, ${x2 - bow} ${y2}, ${x2} ${y2}`;
}

function sameTerminal(a: Terminal | null, b: Terminal | null): boolean {
  return !!a && !!b && a.side === b.side && a.index === b.index;
}

/** The left/right index pair for a link between two opposite-side terminals. */
function linkPair(active: Terminal, other: Terminal) {
  const leftIndex = other.side === 'left' ? other.index : active.index;
  const rightIndex = other.side === 'right' ? other.index : active.index;
  return { leftIndex, rightIndex };
}

export default function WiringPuzzle({ seed, onSolved }: Props) {
  const [puzzle, setPuzzle] = React.useState<WiringPuzzle>(() =>
    generateWiring(seed),
  );
  const [links, setLinks] = React.useState<Record<number, number>>({});
  const [active, setActive] = React.useState<Terminal | null>(null);
  const [pointer, setPointer] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const [hover, setHover] = React.useState<Terminal | null>(null);
  const [rejected, setRejected] = React.useState(false);
  const [solved, setSolved] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const rejectTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    setPuzzle(generateWiring(seed));
    setLinks({});
    setActive(null);
    setSolved(false);
  }, [seed]);

  React.useEffect(() => {
    if (!solved && isWiringSolved(links, puzzle)) {
      setSolved(true);
      setActive(null);
      window.setTimeout(() => onSolved?.(), SOLVED_HOLD_MS);
    }
  }, [links, puzzle, solved, onSolved]);

  React.useEffect(
    () => () => {
      window.clearTimeout(rejectTimer.current);
    },
    [],
  );

  const reject = React.useCallback(() => {
    setRejected(true);
    window.clearTimeout(rejectTimer.current);
    rejectTimer.current = window.setTimeout(() => setRejected(false), 320);
  }, []);

  const toPanelPoint = React.useCallback((clientX: number, clientY: number) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const terminalAt = React.useCallback(
    (clientX: number, clientY: number): Terminal | null => {
      const element = document.elementFromPoint(clientX, clientY);
      const knob = element?.closest<HTMLElement>('[data-terminal]');
      if (!knob) return null;
      const side = knob.dataset.side;
      const index = Number(knob.dataset.index);
      if ((side !== 'left' && side !== 'right') || Number.isNaN(index)) {
        return null;
      }
      return { side, index };
    },
    [],
  );

  const connect = React.useCallback(
    (leftIndex: number, rightIndex: number) => {
      setLinks((prev) => {
        const next = { ...prev };
        delete next[leftIndex];
        for (const key of Object.keys(next)) {
          if (next[Number(key)] === rightIndex) delete next[Number(key)];
        }
        next[leftIndex] = rightIndex;
        return next;
      });
      setActive(null);
      setRejected(false);
    },
    [],
  );

  const detach = React.useCallback((terminal: Terminal) => {
    setLinks((prev) => {
      const next = { ...prev };
      if (terminal.side === 'left') {
        delete next[terminal.index];
      } else {
        for (const key of Object.keys(next)) {
          if (next[Number(key)] === terminal.index) delete next[Number(key)];
        }
      }
      return next;
    });
  }, []);

  /** Arm a terminal, link it, or call out a bad pairing. */
  const press = React.useCallback(
    (terminal: Terminal) => {
      if (solved) return;

      if (!active) {
        detach(terminal);
        setActive(terminal);
        setRejected(false);
        return;
      }

      if (sameTerminal(active, terminal)) {
        setActive(null);
        return;
      }

      if (active.side !== terminal.side) {
        const { leftIndex, rightIndex } = linkPair(active, terminal);
        if (canLink(puzzle, leftIndex, rightIndex)) {
          connect(leftIndex, rightIndex);
          return;
        }
      }

      reject();
      setActive(terminal);
    },
    [active, connect, detach, puzzle, reject, solved],
  );

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (solved) return;
    const terminal = terminalAt(event.clientX, event.clientY);
    if (!terminal) {
      setActive(null);
      setHover(null);
      return;
    }
    panelRef.current?.setPointerCapture?.(event.pointerId);
    setPointer(toPanelPoint(event.clientX, event.clientY));
    press(terminal);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    setPointer(toPanelPoint(event.clientX, event.clientY));
    if (!active) {
      setHover(null);
      return;
    }
    const terminal = terminalAt(event.clientX, event.clientY);
    setHover(
      terminal && terminal.side !== active.side ? terminal : null,
    );
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    setHover(null);
    if (!active || solved) return;

    const terminal = terminalAt(event.clientX, event.clientY);

    // Released over empty panel, abandon the drag.
    if (!terminal) {
      setActive(null);
      return;
    }

    // A tap on the armed terminal keeps it armed for click-to-connect.
    if (sameTerminal(active, terminal)) return;

    if (terminal.side !== active.side) {
      const { leftIndex, rightIndex } = linkPair(active, terminal);
      if (canLink(puzzle, leftIndex, rightIndex)) {
        connect(leftIndex, rightIndex);
        return;
      }
    }

    reject();
    setActive(null);
  }

  function reset() {
    setLinks({});
    setActive(null);
    setHover(null);
    setRejected(false);
  }

  const activePosition = active ? terminalPosition(active, puzzle.size) : null;
  const activeColor = active ? terminalColor(puzzle, active) : WIRE_COLORS[0];
  const hoverIsValidTarget =
    !!active &&
    !!hover &&
    canLink(puzzle, ...(() => {
      const { leftIndex, rightIndex } = linkPair(active, hover);
      return [leftIndex, rightIndex] as const;
    })());

  return (
    <div className="w-full max-w-xl select-none">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-base font-bold uppercase tracking-[0.3em] text-zinc-100">
          Wiring Panel
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            aria-label="reset wiring"
            className="flex h-8 w-8 items-center justify-center border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-100"
          >
            <svg
              width="14"
              height="14"
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
        </div>
      </div>

      <div
        ref={panelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setActive(null);
          setHover(null);
        }}
        className={`relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden border-2 bg-zinc-950 transition-colors duration-200 ${
          rejected
            ? 'border-white'
            : solved
              ? 'border-white'
              : 'border-zinc-700'
        }`}
      >
        <div className="absolute inset-y-0 left-0 w-[8%] border-r border-zinc-800 bg-zinc-900/70" />
        <div className="absolute inset-y-0 right-0 w-[8%] border-l border-zinc-800 bg-zinc-900/70" />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {Object.entries(links).map(([leftKey, rightIndex]) => {
            const leftIndex = Number(leftKey);
            const start = terminalPosition(
              { side: 'left', index: leftIndex },
              puzzle.size,
            );
            const end = terminalPosition(
              { side: 'right', index: rightIndex },
              puzzle.size,
            );
            const color =
              WIRE_COLORS[puzzle.left[leftIndex] as number] ?? WIRE_COLORS[0];
            const path = wirePath(start.x, start.y, end.x, end.y);
            return (
              <g key={leftIndex}>
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(0,0,0,0.7)"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                  className={solved ? 'wire-flow' : undefined}
                  strokeDasharray={solved ? '3 3' : undefined}
                />
              </g>
            );
          })}

          {activePosition && pointer && (
            <path
              d={wirePath(
                activePosition.x,
                activePosition.y,
                pointer.x,
                pointer.y,
              )}
              fill="none"
              stroke={activeColor}
              strokeWidth={1}
              strokeDasharray="2 2"
              strokeLinecap="round"
              opacity={0.8}
            />
          )}
        </svg>

        {(['left', 'right'] as const).map((side) =>
          Array.from({ length: puzzle.size }, (_, index) => {
            const terminal: Terminal = { side, index };
            const position = terminalPosition(terminal, puzzle.size);
            const color = terminalColor(puzzle, terminal);
            const isActive = sameTerminal(active, terminal);
            const isTarget = hoverIsValidTarget && sameTerminal(hover, terminal);
            const isLinked =
              side === 'left'
                ? links[index] !== undefined
                : Object.values(links).includes(index);

            return (
              <button
                key={`${side}-${index}`}
                type="button"
                data-terminal="true"
                data-side={side}
                data-index={index}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    press(terminal);
                  }
                }}
                aria-label={`${side} terminal ${index + 1}`}
                aria-pressed={isLinked}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  borderColor: isActive ? '#ffffff' : color,
                }}
                className={`absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 bg-zinc-950 transition-transform duration-150 hover:scale-110 ${
                  isActive ? 'scale-125' : ''
                } ${isTarget ? 'ring-2 ring-white/70' : ''}`}
              >
                <span
                  className="block h-3.5 w-3.5"
                  style={{ background: color }}
                />
              </button>
            );
          }),
        )}

        {(rejected || solved) && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
            <span
              role="status"
              aria-live="polite"
              className={`font-mono text-sm uppercase tracking-[0.3em] ${
                solved ? 'text-zinc-100' : 'text-zinc-500'
              }`}
            >
              {solved ? 'Circuit complete' : 'No matching terminal'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

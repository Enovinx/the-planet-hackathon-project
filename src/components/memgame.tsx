import { useState, useRef, useCallback } from "react";

const START_LENGTH = 3;
const MAX_LENGTH = 6;
const SHOW_DELAY_MS = 550;
const GAP_MS = 250;
const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type GameKey = (typeof KEYS)[number];

type GameStatus = "idle" | "showing" | "input" | "success" | "fail" | "won";

interface FlashKeyState {
  key: GameKey;
  correct: boolean;
}

interface KeypadMemoryGameProps {
  onWin?: () => void;
}

export default function KeypadMemoryGame({ onWin }: KeypadMemoryGameProps) {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [sequence, setSequence] = useState<GameKey[]>([]);
  const [inputIndex, setInputIndex] = useState<number>(0);
  const [activeKey, setActiveKey] = useState<GameKey | null>(null);
  const [flashKey, setFlashKey] = useState<FlashKeyState | null>(null);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = (): void => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const schedule = (fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const randomKey = (): GameKey => KEYS[Math.floor(Math.random() * KEYS.length)];

  const playSequence = useCallback((seq: GameKey[]): void => {
    setStatus("showing");
    setInputIndex(0);
    seq.forEach((key, i) => {
      schedule(() => setActiveKey(key), i * (SHOW_DELAY_MS + GAP_MS));
      schedule(
        () => setActiveKey(null),
        i * (SHOW_DELAY_MS + GAP_MS) + SHOW_DELAY_MS
      );
    });
    schedule(() => setStatus("input"), seq.length * (SHOW_DELAY_MS + GAP_MS));
  }, []);

  const startGame = (): void => {
    clearTimers();
    const first = Array.from({ length: START_LENGTH }, randomKey);
    setSequence(first);
    playSequence(first);
  };

  const nextLevel = (seq: GameKey[]): void => {
    const grown = [...seq, randomKey()];
    setSequence(grown);
    schedule(() => playSequence(grown), 700);
  };

  const handleKeyPress = (key: GameKey): void => {
    if (status !== "input") return;

    const expected = sequence[inputIndex];
    const correct = key === expected;

    setFlashKey({ key, correct });
    schedule(() => setFlashKey(null), 200);

    if (!correct) {
      setStatus("fail");
      return;
    }

    const nextIndex = inputIndex + 1;
    if (nextIndex === sequence.length) {
      if (sequence.length === MAX_LENGTH) {
        setStatus("won");
        onWin?.();
      } else {
        setStatus("success");
        nextLevel(sequence);
      }
    } else {
      setInputIndex(nextIndex);
    }
  };

  const reset = (): void => {
    clearTimers();
    setStatus("idle");
    setSequence([]);
    setInputIndex(0);
    setActiveKey(null);
    setFlashKey(null);
  };

  const level = Math.max(sequence.length, START_LENGTH);

  const statusText: Record<GameStatus, string> = {
    idle: "Initiate uplink to begin authorization",
    showing: "Relay transmitting code: observe",
    input: "Re-enter the transmitted sequence",
    success: "Code accepted. Escalating clearance...",
    fail: `Sequence rejected: breach at tier ${sequence.length}`,
    won: "Override complete. Full ship access granted.",
  };

  return (
    <div className="kpm-wrap">
      <style>{CSS}</style>

      <div className="kpm-card">
        <header className="kpm-header">
          <h1 className="kpm-title">Access Terminal</h1>
          <span className="kpm-tier">
            Tier {status === "idle" ? "0" : level} / {MAX_LENGTH}
          </span>
        </header>

        <p
          className={`kpm-status kpm-status--${status}`}
          role="status"
          aria-live="polite"
        >
          {statusText[status]}
        </p>

        <div className="kpm-grid">
          {KEYS.map((key) => {
            const isActive = activeKey === key;
            const flash = flashKey && flashKey.key === key ? flashKey : null;
            const classes = [
              "kpm-key",
              isActive ? "kpm-key--lit" : "",
              flash ? (flash.correct ? "kpm-key--good" : "kpm-key--bad") : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={key}
                type="button"
                className={classes}
                disabled={status !== "input"}
                onClick={() => handleKeyPress(key)}
                aria-label={`Key ${key}`}
              >
                {key}
              </button>
            );
          })}
        </div>

        <div className="kpm-controls">
          {status === "idle" && (
            <button className="kpm-btn kpm-btn--primary" onClick={startGame}>
              Engage uplink
            </button>
          )}
          {(status === "fail" || status === "won") && (
            <button className="kpm-btn kpm-btn--primary" onClick={startGame}>
              Retry uplink
            </button>
          )}
          {status !== "idle" && (
            <button className="kpm-btn kpm-btn--ghost" onClick={reset}>
              Abort
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const CSS = `
.kpm-wrap {
  --kpm-hull: #050505;
  --kpm-panel: #0f0505;
  --kpm-rivet: #dc2626;
  --kpm-text: #ef4444;
  --kpm-muted: #fca5a5;
  --kpm-accent: #fbbf24;
  --kpm-accent-dim: #b45309;
  --kpm-bad: #ff3b3b;
  min-height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: var(--kpm-hull);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  color: var(--kpm-text);
  box-sizing: border-box;
}
.kpm-wrap *, .kpm-wrap *::before, .kpm-wrap *::after { box-sizing: border-box; }

.kpm-card {
  width: 100%;
  max-width: 420px;
  background: var(--kpm-panel);
  border: 2px solid var(--kpm-rivet);
  border-radius: 0px;
  padding: 26px 22px 22px;
  position: relative;
  box-shadow: 0 0 50px rgba(255, 0, 0, 0.25);
}
.kpm-card::before,
.kpm-card::after {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
}

.kpm-header {
  margin-bottom: 20px;
  border-bottom: 2px solid var(--kpm-rivet);
  padding-bottom: 12px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.kpm-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--kpm-text);
  text-shadow: 0 0 14px rgba(239, 68, 68, 0.45);
}
.kpm-tier {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--kpm-accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.kpm-status {
  min-height: 20px;
  margin: 0 0 18px;
  font-size: 14px;
  font-weight: 700;
  color: var(--kpm-muted);
  letter-spacing: 0.01em;
  text-transform: uppercase;
}
.kpm-status--input { color: var(--kpm-accent); }
.kpm-status--fail { color: var(--kpm-bad); }
.kpm-status--won { color: var(--kpm-accent); }

.kpm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.kpm-key {
  aspect-ratio: 1 / 1;
  border-radius: 0px;
  border: 2px solid var(--kpm-rivet);
  background: var(--kpm-hull);
  color: var(--kpm-text);
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
  font-family: inherit;
  transition: background 100ms ease, box-shadow 100ms ease;
}
.kpm-key:disabled { cursor: default; opacity: 0.35; }
.kpm-key:not(:disabled):active {
  transform: translateY(1px);
}

.kpm-key--lit {
  background: var(--kpm-accent);
  border-color: var(--kpm-accent);
  color: #1a1104;
  box-shadow: 0 0 18px rgba(251, 191, 36, 0.5);
}
.kpm-key--good {
  background: #166534;
  border-color: #22c55e;
  color: #4ade80;
}
.kpm-key--bad {
  background: #450a0a;
  border-color: var(--kpm-bad);
  color: #f87171;
  box-shadow: 0 0 18px rgba(255, 59, 59, 0.5);
}

.kpm-controls {
  display: flex;
  gap: 10px;
}

.kpm-btn {
  flex: 1;
  padding: 12px 14px;
  border-radius: 0px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  border: 2px solid var(--kpm-rivet);
  background: var(--kpm-hull);
  color: var(--kpm-text);
  font-family: inherit;
}
.kpm-btn--primary {
  background: var(--kpm-accent);
  border-color: var(--kpm-accent);
  color: #1a1104;
}
.kpm-btn--ghost {
  color: var(--kpm-muted);
}

.kpm-key:focus-visible,
.kpm-btn:focus-visible {
  outline: 3px solid var(--kpm-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .kpm-key, .kpm-btn { transition: none; }
}
`;

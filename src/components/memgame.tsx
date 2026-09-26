import { useState, useRef, useCallback } from "react";

const START_LENGTH = 3;
// Climb from 3 up to 6 and you're through — no long haul to 12.
const MAX_LENGTH = 6;
const SHOW_DELAY_MS = 550; // time each key stays lit
const GAP_MS = 250; // gap between lit keys
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

// idle -> showing -> input -> (success -> showing | fail -> idle) -> won
export default function KeypadMemoryGame({ onWin }: KeypadMemoryGameProps) {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [sequence, setSequence] = useState<GameKey[]>([]);
  const [inputIndex, setInputIndex] = useState<number>(0);
  const [activeKey, setActiveKey] = useState<GameKey | null>(null); // key currently lit (playback or press feedback)
  const [flashKey, setFlashKey] = useState<FlashKeyState | null>(null); // feedback for input
  const [best, setBest] = useState<number>(0);

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
      setBest((b) => Math.max(b, sequence.length - 1));
      return;
    }

    const nextIndex = inputIndex + 1;
    if (nextIndex === sequence.length) {
      if (sequence.length === MAX_LENGTH) {
        setStatus("won");
        setBest(MAX_LENGTH);
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
    showing: "Relay transmitting code — observe",
    input: "Re-enter the transmitted sequence",
    success: "Code accepted. Escalating clearance...",
    fail: `Sequence rejected — breach at tier ${sequence.length}`,
    won: "Override complete. Full ship access granted.",
  };

  return (
    <div className="kpm-wrap">
      <style>{CSS}</style>

      <div className="kpm-card">
        <header className="kpm-header">
          <span className="kpm-eyebrow">Nav Computer // Auth Relay</span>
          <h1 className="kpm-title">Access Terminal</h1>
        </header>

        <div className="kpm-meta">
          <div className="kpm-meta-item">
            <span className="kpm-meta-label">Clearance Tier</span>
            <span className="kpm-meta-value">
              {status === "idle" ? "—" : `${level} / ${MAX_LENGTH}`}
            </span>
          </div>
          <div className="kpm-meta-item">
            <span className="kpm-meta-label">Max Tier</span>
            <span className="kpm-meta-value">{best}</span>
          </div>
        </div>

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
  --kpm-hull: #0a0a12;
  --kpm-hull-2: #0a0a12;
  --kpm-panel: #6c4cff;
  --kpm-rivet: #000000;
  --kpm-text: #ffffff;
  --kpm-muted: #d8d0ff;
  --kpm-accent: #ffe600;
  --kpm-accent-dim: #b3a400;
  --kpm-bad: #ff3b3b;
  min-height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background:
    radial-gradient(2px 2px at 20% 30%, #ffffff 0%, transparent 60%),
    radial-gradient(2px 2px at 70% 15%, #ffffff 0%, transparent 60%),
    radial-gradient(1.5px 1.5px at 85% 60%, #ffffff 0%, transparent 60%),
    radial-gradient(1.5px 1.5px at 40% 80%, #ffffff 0%, transparent 60%),
    radial-gradient(1.5px 1.5px at 10% 65%, #ffffff 0%, transparent 60%),
    var(--kpm-hull);
  font-family: "Space Mono", "Courier New", ui-monospace, monospace;
  color: var(--kpm-text);
  box-sizing: border-box;
}
.kpm-wrap *, .kpm-wrap *::before, .kpm-wrap *::after { box-sizing: border-box; }

.kpm-card {
  width: 100%;
  max-width: 380px;
  background: var(--kpm-panel);
  border: 4px solid var(--kpm-rivet);
  border-radius: 0px;
  padding: 26px 22px 22px;
  position: relative;
  box-shadow: 10px 10px 0 var(--kpm-rivet);
}
.kpm-card::before,
.kpm-card::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--kpm-accent);
  border: 3px solid var(--kpm-rivet);
  top: -7px;
}
.kpm-card::before { left: -7px; }
.kpm-card::after { right: -7px; }

.kpm-header {
  margin-bottom: 16px;
  border-bottom: 4px solid var(--kpm-rivet);
  padding-bottom: 12px;
}
.kpm-eyebrow {
  display: block;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--kpm-hull);
  background: var(--kpm-accent);
  border: 2px solid var(--kpm-rivet);
  padding: 2px 6px;
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: 700;
  width: fit-content;
}
.kpm-title {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--kpm-text);
  -webkit-text-stroke: 1px var(--kpm-rivet);
}

.kpm-meta {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}
.kpm-meta-item {
  flex: 1;
  background: var(--kpm-hull);
  border: 3px solid var(--kpm-rivet);
  border-radius: 0px;
  padding: 8px 12px;
  box-shadow: 4px 4px 0 var(--kpm-rivet);
}
.kpm-meta-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--kpm-muted);
  margin-bottom: 3px;
  font-weight: 700;
}
.kpm-meta-value {
  font-size: 18px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--kpm-accent);
}

.kpm-status {
  min-height: 20px;
  margin: 0 0 18px;
  font-size: 13px;
  font-weight: 700;
  color: var(--kpm-text);
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
  border: 3px solid var(--kpm-rivet);
  background: var(--kpm-hull);
  color: var(--kpm-text);
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 5px 5px 0 var(--kpm-rivet);
  transition: transform 80ms ease, box-shadow 80ms ease, background 100ms ease;
}
.kpm-key:disabled { cursor: default; opacity: 0.5; }
.kpm-key:not(:disabled):active {
  transform: translate(5px, 5px);
  box-shadow: 0 0 0 var(--kpm-rivet);
}

.kpm-key--lit {
  background: var(--kpm-accent);
  border-color: var(--kpm-rivet);
  color: var(--kpm-hull);
}
.kpm-key--good {
  background: #00e07a;
  border-color: var(--kpm-rivet);
  color: var(--kpm-hull);
}
.kpm-key--bad {
  background: var(--kpm-bad);
  border-color: var(--kpm-rivet);
  color: var(--kpm-hull);
}

.kpm-controls {
  display: flex;
  gap: 10px;
}

.kpm-btn {
  flex: 1;
  padding: 12px 14px;
  border-radius: 0px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  border: 3px solid var(--kpm-rivet);
  background: var(--kpm-hull);
  color: var(--kpm-text);
  box-shadow: 5px 5px 0 var(--kpm-rivet);
  transition: transform 80ms ease, box-shadow 80ms ease;
}
.kpm-btn:active {
  transform: translate(5px, 5px);
  box-shadow: 0 0 0 var(--kpm-rivet);
}
.kpm-btn--primary {
  background: var(--kpm-accent);
  color: var(--kpm-hull);
}
.kpm-btn--ghost {
  background: var(--kpm-panel);
  color: var(--kpm-text);
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

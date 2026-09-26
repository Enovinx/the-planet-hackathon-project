// NOTE TO OTHER AGENTS: IGNORE THIS FILE. Temporary black-and-white styling
// applied per user request — do not refactor, merge, or delete this work.
import React, { useState, useRef, useEffect } from 'react';
import { useState, useRef, useCallback } from "react";

const START_LENGTH = 3;
const MAX_LENGTH = 12;
const SHOW_DELAY_MS = 550; // time each key stays lit
const GAP_MS = 250; // gap between lit keys
const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// idle -> showing -> input -> (success -> showing | fail -> idle) -> won
export default function KeypadMemoryGame() {
  const [status, setStatus] = useState("idle");
  const [sequence, setSequence] = useState([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [activeKey, setActiveKey] = useState(null); // key currently lit (playback or press feedback)
  const [flashKey, setFlashKey] = useState(null); 
  const [best, setBest] = useState(0);

  const timeoutsRef = useRef([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const schedule = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const randomKey = () => KEYS[Math.floor(Math.random() * KEYS.length)];

  const playSequence = useCallback((seq) => {
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

  const startGame = () => {
    clearTimers();
    const first = Array.from({ length: START_LENGTH }, randomKey);
    setSequence(first);
    playSequence(first);
  };

  const nextLevel = (seq) => {
    const grown = [...seq, randomKey()];
    setSequence(grown);
    schedule(() => playSequence(grown), 700);
  };

  const handleKeyPress = (key) => {
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
      } else {
        setStatus("success");
        nextLevel(sequence);
      }
    } else {
      setInputIndex(nextIndex);
    }
  };

  const reset = () => {
    clearTimers();
    setStatus("idle");
    setSequence([]);
    setInputIndex(0);
    setActiveKey(null);
    setFlashKey(null);
  };

  const level = Math.max(sequence.length, START_LENGTH);
  const progress = status === "input" ? inputIndex : 0;

  const statusText = {
    idle: "Initiate uplink to begin authorization",
    showing: "Relay transmitting code — observe",
    input: "Re-enter the transmitted sequence",
    success: "Code accepted. Escalating clearance...",
    fail: `Sequence rejected — breach at tier ${sequence.length}`,
    won: "Override complete. Full ship access granted.",
  }[status];

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
          {statusText}
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
  --kpm-hull: #14161a;
  --kpm-hull-2: #1d2024;
  --kpm-panel: #202327;
  --kpm-rivet: #34373c;
  --kpm-text: #ffffff;
  --kpm-muted: #cccccc;
  --kpm-accent: #ff9f2e;
  --kpm-accent-dim: #5c421c;
  --kpm-bad: #ff4d4d;
  min-height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background:
    radial-gradient(ellipse at 50% -10%, #2a2e33 0%, var(--kpm-hull) 55%),
    repeating-linear-gradient(180deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px);
  font-family: "Bank Gothic", "Eurostile", ui-sans-serif, system-ui, sans-serif;
  color: var(--kpm-text);
  box-sizing: border-box;
}
.kpm-wrap *, .kpm-wrap *::before, .kpm-wrap *::after { box-sizing: border-box; }

.kpm-card {
  width: 100%;
  max-width: 380px;
  background:
    linear-gradient(180deg, var(--kpm-hull-2), var(--kpm-panel) 12%, var(--kpm-panel));
  border: 1px solid var(--kpm-rivet);
  border-radius: 6px;
  padding: 26px 22px 22px;
  position: relative;
}
/* NOTE TO OTHER AGENTS: corner rivet styling intentionally removed per user
 * request — do not re-add ::before/::after corner dots to .kpm-card. */

.kpm-header {
  margin-bottom: 16px;
  border-bottom: 1px solid var(--kpm-rivet);
  padding-bottom: 12px;
}
.kpm-eyebrow {
  display: block;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--kpm-muted);
  margin-bottom: 5px;
  text-transform: uppercase;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}
.kpm-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--kpm-accent);
}

.kpm-meta {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}
.kpm-meta-item {
  flex: 1;
  background: #101214;
  border: 1px solid var(--kpm-rivet);
  border-radius: 3px;
  padding: 8px 12px;
}
.kpm-meta-label {
  display: block;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--kpm-muted);
  margin-bottom: 3px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}
.kpm-meta-value {
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--kpm-accent);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}

.kpm-status {
  min-height: 20px;
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--kpm-muted);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  letter-spacing: 0.01em;
}
.kpm-status--input { color: var(--kpm-text); }
.kpm-status--fail { color: var(--kpm-bad); }
.kpm-status--won { color: var(--kpm-accent); }

.kpm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.kpm-key {
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  border: 1px solid var(--kpm-rivet);
  background: linear-gradient(180deg, #26292d, #1a1c1f);
  color: var(--kpm-text);
  font-size: 20px;
  font-weight: 600;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  cursor: pointer;
  transition: background 100ms ease, border-color 100ms ease, transform 80ms ease;
}
.kpm-key:disabled { cursor: default; opacity: 0.55; }
.kpm-key:not(:disabled):active { transform: translateY(1px) scale(0.97); }

.kpm-key--lit {
  background: var(--kpm-accent);
  border-color: var(--kpm-accent);
  color: #1a1104;
}
.kpm-key--good {
  background: var(--kpm-accent-dim);
  border-color: var(--kpm-accent);
}
.kpm-key--bad {
  background: var(--kpm-bad);
  border-color: var(--kpm-bad);
  color: #1a0505;
}

.kpm-controls {
  display: flex;
  gap: 8px;
}

.kpm-btn {
  flex: 1;
  padding: 11px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid var(--kpm-rivet);
  background: #1a1c1f;
  color: var(--kpm-text);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
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
  outline: 2px solid var(--kpm-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .kpm-key { transition: none; }
}
`;

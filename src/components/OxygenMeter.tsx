import * as React from 'react';

const START_PERCENT = 80;
const DURATION_MS = 180000;
const TICK_MS = 250;
const LOW_PERCENT = 20;

function formatPercent(value: number): string {
  return `${Math.ceil(value)}%`;
}

interface OxygenMeterProps {
  /** Called when the player restarts after oxygen depletion, so the whole game can reset. */
  onRestart?: () => void;
}

export default function OxygenMeter({ onRestart }: OxygenMeterProps) {
  const [remaining, setRemaining] = React.useState(START_PERCENT);
  const [dead, setDead] = React.useState(false);
  const [runId, setRunId] = React.useState(0);
  const startedAtRef = React.useRef<number | null>(null);
  const onRestartRef = React.useRef<OxygenMeterProps['onRestart']>(onRestart);
  onRestartRef.current = onRestart;

  React.useEffect(() => {
    startedAtRef.current = Date.now();
    setRemaining(START_PERCENT);
    setDead(false);

    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, START_PERCENT - (elapsed / DURATION_MS) * START_PERCENT);
      setRemaining(left);

      if (left <= 0) {
        window.clearInterval(timer);
        setDead(true);
      }
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [runId]);

  const restart = React.useCallback(() => {
    setRunId((id) => id + 1);
    onRestartRef.current?.();
  }, []);

  const low = remaining <= LOW_PERCENT && !dead;
  const critical = dead || low;
  const barWidth = `${(remaining / START_PERCENT) * 100}%`;

  return (
    <>
      <div className="pointer-events-none fixed right-4 top-4 z-[60] select-none font-mono">
        <div
          className={`border-2 bg-black px-3 py-2 ${
            critical ? 'border-white' : 'border-zinc-600'
          }`}
        >
          <div className="flex items-center justify-between gap-6">
            <span
              className={`text-lg font-bold uppercase tabular-nums text-zinc-100 ${
                low ? 'animate-pulse' : ''
              }`}
            >
              O2 {formatPercent(remaining)}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-40 bg-zinc-800">
            <div
              className="h-full bg-white transition-[width] duration-200"
              style={{ width: barWidth }}
            />
          </div>
        </div>
      </div>

      {dead && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black px-6 text-center font-mono text-white">
          <h1 className="text-4xl font-bold uppercase tracking-widest text-zinc-100 sm:text-7xl">
            Oxygen Depleted
          </h1>
          <button
            type="button"
            onClick={restart}
            className="mt-6 border-2 border-white bg-white px-8 py-3 text-base font-bold uppercase tracking-[0.35em] text-black transition-colors hover:bg-zinc-300"
          >
            Try Again
          </button>
        </div>
      )}
    </>
  );
}

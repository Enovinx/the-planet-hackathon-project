import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface VictoryScreenProps {
  durationMs: number;
  skipped: number;
  onRestart: () => void;
}

const BEST_KEY = 'planet-fresh-best-ms';

function formatDuration(ms: number): string {
  const totalTenths = Math.max(0, Math.floor(ms / 100));
  const m = Math.floor(totalTenths / 600);
  const s = Math.floor((totalTenths % 600) / 10);
  const t = totalTenths % 10;
  return `${m}:${s < 10 ? '0' : ''}${s}.${t}`;
}

function loadBest(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export default function VictoryScreen({
  durationMs,
  skipped,
  onRestart,
}: VictoryScreenProps) {
  const [initials, setInitials] = React.useState<string>('');
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const submitRun = useMutation(api.runs.submitRun);
  const topRuns = useQuery(api.runs.topRuns);

  const best = React.useMemo(() => loadBest(), []);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (best === null || durationMs < best) {
        window.localStorage.setItem(BEST_KEY, String(Math.floor(durationMs)));
      }
    } catch {
      // ignore storage failures
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNewBest = best === null || durationMs <= best;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (submitted) return;
    const clean = initials.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (clean.length === 0) {
      setSubmitError('ENTER 3 INITIALS');
      return;
    }
    setSubmitError(null);
    submitRun({ initials: clean, durationMs, skipped })
      .then(() => setSubmitted(true))
      .catch(() => setSubmitError('UPLINK FAILED — BACKEND OFFLINE?'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 border-2 border-emerald-400 bg-zinc-950 px-8 py-10 text-center shadow-[10px_10px_0px_rgba(52,211,153,1)]">
        <img
          src="/assets/ship/Main%20Ship%20-%20Base%20-%20Full%20health.png"
          alt="Restored ship"
          draggable={false}
          className="w-3/4 select-none"
          style={{ imageRendering: 'pixelated' }}
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-emerald-400">
          Signal reached
        </p>
        <h2 className="font-mono text-3xl font-bold uppercase tracking-widest text-zinc-100">
          Escaped
        </h2>
        <p className="font-mono text-sm leading-relaxed text-zinc-400">
          Escape pod launched. You cleared the debris field and made it off
          the planet.
        </p>

        <div className="flex w-full items-center justify-between border border-zinc-800 bg-black px-4 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            Run time
          </span>
          <span className="font-mono text-2xl font-bold text-yellow-400">
            {formatDuration(durationMs)}
          </span>
        </div>
        {isNewBest && (
          <p className="animate-pulse font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            New best
          </p>
        )}
        {skipped > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
            {skipped} stage{skipped === 1 ? '' : 's'} skipped
          </p>
        )}

        {submitted ? (
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Logged to leaderboard
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <input
              type="text"
              value={initials}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInitials(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 3),
                )
              }
              placeholder="ABC"
              aria-label="Leaderboard initials"
              autoComplete="off"
              className="w-20 border-2 border-zinc-700 bg-black px-3 py-2 text-center font-mono text-xl font-bold uppercase tracking-[0.3em] text-yellow-400 outline-none focus:border-yellow-400 placeholder:text-zinc-700"
            />
            <button
              type="submit"
              className="flex-1 border-2 border-yellow-400 bg-yellow-400 px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-yellow-300"
            >
              Log run
            </button>
          </form>
        )}
        {submitError !== null && (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-500">
            {submitError}
          </p>
        )}

        <div className="w-full border border-zinc-800 bg-black px-4 py-3 text-left">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            Fastest escapes
          </p>
          {topRuns === undefined ? (
            <p className="font-mono text-xs text-zinc-600">
              {typeof window !== 'undefined' ? 'LOADING…' : ''}
            </p>
          ) : topRuns.length === 0 ? (
            <p className="font-mono text-xs text-zinc-600">
              NO RUNS LOGGED — BE THE FIRST
            </p>
          ) : (
            <ol className="space-y-1">
              {topRuns.map((run, i) => (
                <li
                  key={run._id}
                  className="flex items-center justify-between font-mono text-sm"
                >
                  <span className="text-zinc-400">
                    {i + 1}. {run.initials}
                  </span>
                  <span className="font-bold text-yellow-400">
                    {formatDuration(run.durationMs)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="mt-2 border-2 border-emerald-400 bg-emerald-400 px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-emerald-300"
        >
          Play again
        </button>
      </div>
    </div>
  );
}

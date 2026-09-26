import { useCallback, useState } from 'react';
import KeypadMemoryGame from './memgame';
import Terminal from './terminal';
import EscapePod from './escapepod';
import GeneratorRepairPuzzle from './GeneratorRepairPuzzle';
import SoundToggle from './SoundToggle';
import WiringPuzzle from './WiringPuzzle';

type OverlayType =
  | 'keypad'
  | 'terminal'
  | 'generator'
  | 'wiring'
  | 'escape'
  | null;

interface Progress {
  powerKeys: boolean;
  sysCrashed: boolean;
  coreFixed: boolean;
  powerRestored: boolean;
}

interface Station {
  id: Exclude<OverlayType, null>;
  label: string;
  rect: { left: string; top: string; width: string; height: string };
  unlocked: boolean;
  done: boolean;
}

const PANEL_ASPECT = 1761 / 1011;

const HULL_STATES = [
  '/assets/ship/Main%20Ship%20-%20Base%20-%20Very%20damaged.png',
  '/assets/ship/Main%20Ship%20-%20Base%20-%20Damaged.png',
  '/assets/ship/Main%20Ship%20-%20Base%20-%20Slight%20damage.png',
  '/assets/ship/Main%20Ship%20-%20Base%20-%20Slight%20damage.png',
  '/assets/ship/Main%20Ship%20-%20Base%20-%20Full%20health.png',
];

const STEP_ORDER: (keyof Progress)[] = [
  'powerKeys',
  'sysCrashed',
  'coreFixed',
  'powerRestored',
];

const EMPTY_PROGRESS: Progress = {
  powerKeys: false,
  sysCrashed: false,
  coreFixed: false,
  powerRestored: false,
};

export default function AirlockRoom() {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [notice, setNotice] = useState<string | null>(null);
  const [escaped, setEscaped] = useState<boolean>(false);

  const complete = useCallback((flag: keyof Progress) => {
    setProgress((prev) => ({ ...prev, [flag]: true }));
    setActiveOverlay(null);
  }, []);

  const openStation = useCallback(
    (station: Station) => {
      if (!station.unlocked) {
        setNotice(`${station.label}: no power. Bring the ship back online first.`);
        window.setTimeout(() => setNotice(null), 2200);
        return;
      }
      setNotice(null);
      setActiveOverlay(station.id);
    },
    [],
  );

  const stations: Station[] = [
    {
      id: 'terminal',
      label: 'SYS Terminal',
      rect: { left: '3.4%', top: '70.8%', width: '18.8%', height: '12.5%' },
      unlocked: progress.powerKeys,
      done: progress.sysCrashed,
    },
    {
      id: 'keypad',
      label: 'Keypad',
      rect: { left: '65.7%', top: '87.7%', width: '18.5%', height: '6.5%' },
      unlocked: true,
      done: progress.powerKeys,
    },
    {
      id: 'generator',
      label: 'Power Core',
      rect: { left: '40.7%', top: '81.2%', width: '18.7%', height: '13%' },
      unlocked: progress.sysCrashed,
      done: progress.coreFixed,
    },
    {
      id: 'wiring',
      label: 'Wiring Panel',
      rect: { left: '90%', top: '72.4%', width: '6.7%', height: '21.8%' },
      unlocked: progress.coreFixed,
      done: progress.powerRestored,
    },
    {
      id: 'escape',
      label: 'Escape Pod',
      rect: { left: '71%', top: '69.7%', width: '13.5%', height: '10.3%' },
      unlocked: progress.powerRestored,
      done: false,
    },
  ];

  const completedSteps = STEP_ORDER.filter((flag) => progress[flag]).length;

  // Judge failsafes: always clickable above overlays. SKIP advances one
  // stage, RESET restarts the whole run for the next demo.
  const skipStage = useCallback(() => {
    const next = STEP_ORDER.find((flag) => !progress[flag]);
    if (next) complete(next);
    setActiveOverlay(null);
  }, [progress, complete]);

  const resetDemo = useCallback(() => {
    setProgress(EMPTY_PROGRESS);
    setEscaped(false);
    setActiveOverlay(null);
    setNotice(null);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <SoundToggle />
      <button
        type="button"
        onClick={skipStage}
        aria-label="Skip stage"
        title="Skip stage"
        className="fixed left-4 top-4 z-[80] border border-zinc-800 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 opacity-40 transition-opacity hover:opacity-100"
      >
        Skip
      </button>
      <button
        type="button"
        onClick={resetDemo}
        aria-label="Reset demo"
        title="Reset demo"
        className="fixed right-16 top-4 z-[80] border border-zinc-800 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 opacity-40 transition-opacity hover:opacity-100"
      >
        Reset
      </button>
      <div
        className="relative max-h-screen"
        style={{
          aspectRatio: `${PANEL_ASPECT}`,
          width: `min(100vw, calc(100vh * ${PANEL_ASPECT}))`,
        }}
      >
        <img
          src="/assets/control-panel.png"
          alt="Ship control panel"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Ship status schematic sitting in the dark wedge under the viewport. */}
        <div
          className="pointer-events-none absolute flex flex-col items-center"
          style={{ left: '40%', top: '50%', width: '20%' }}
        >
          <img
            src={HULL_STATES[completedSteps]}
            alt=""
            className="w-full"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="mt-1.5 flex gap-1.5">
            {STEP_ORDER.map((flag, index) => (
              <span
                key={flag}
                className="block h-2 w-2 rounded-full border border-black/60"
                style={{
                  background: progress[flag]
                    ? '#4ade80'
                    : index === completedSteps
                      ? '#eab308'
                      : '#27272a',
                }}
              />
            ))}
          </div>
        </div>

        {stations.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => openStation(station)}
            disabled={!station.unlocked}
            aria-label={station.label}
            title={station.label}
            style={station.rect}
            className={`group absolute rounded-sm border-2 transition-colors duration-200 focus:outline-none ${
              station.done
                ? 'border-emerald-400/70 bg-emerald-400/5'
                : station.unlocked
                  ? 'station-ready cursor-pointer border-yellow-400/60 bg-yellow-400/5 hover:bg-yellow-400/25'
                  : 'cursor-not-allowed border-zinc-500/20 bg-black/25'
            }`}
          >
            <span
              className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-sm border px-2 py-1 font-mono text-sm uppercase tracking-[0.2em] transition-opacity duration-150 ${
                station.unlocked
                  ? 'border-yellow-400/40 bg-black/85 text-yellow-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  : 'border-zinc-600/40 bg-black/85 text-zinc-500 opacity-0 group-hover:opacity-100'
              }`}
            >
              {station.done ? `${station.label} ✓` : station.label}
            </span>
          </button>
        ))}

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute bottom-[3%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-yellow-400/40 bg-black/85 px-4 py-1.5 font-mono text-sm uppercase tracking-[0.2em] text-yellow-300"
          >
            {notice}
          </div>
        )}
      </div>

      {activeOverlay && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/92">
          <button
            type="button"
            onClick={() => setActiveOverlay(null)}
            aria-label="Back to the bridge"
            className="fixed right-4 top-4 z-[60] flex h-9 w-9 items-center justify-center border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-100"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {activeOverlay === 'keypad' && (
            <div className="flex min-h-full items-center justify-center p-6">
              <KeypadMemoryGame onWin={() => complete('powerKeys')} />
            </div>
          )}

          {activeOverlay === 'terminal' && (
            <div className="flex min-h-full items-center justify-center">
              <Terminal onCrash={() => complete('sysCrashed')} />
            </div>
          )}

          {activeOverlay === 'generator' && (
            <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6">
              <GeneratorRepairPuzzle onSolved={() => complete('coreFixed')} />
            </div>
          )}

          {activeOverlay === 'wiring' && (
            <div className="flex min-h-full items-center justify-center p-6">
              <WiringPuzzle onSolved={() => complete('powerRestored')} />
            </div>
          )}

          {activeOverlay === 'escape' && (
            <EscapePod
              onWin={() => {
                setActiveOverlay(null);
                setEscaped(true);
              }}
            />
          )}
        </div>
      )}

      {escaped && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
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
              Escape pod launched. You cleared the debris field and made it
              off the planet. The rescue fleet has your signal.
            </p>
            <button
              type="button"
              onClick={() => {
                setProgress(EMPTY_PROGRESS);
                setEscaped(false);
                setNotice(null);
              }}
              className="mt-2 border-2 border-emerald-400 bg-emerald-400 px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-emerald-300"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

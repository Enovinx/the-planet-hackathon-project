import { useCallback, useEffect, useState } from 'react';
import KeypadMemoryGame from './memgame';
import Terminal from './terminal';
import EscapePod from './escapepod';
import GeneratorRepairPuzzle from './GeneratorRepairPuzzle';
import WiringPuzzle from './WiringPuzzle';
import EarthFinale from './EarthFinale';

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

const PX = 8;
const STAGE_W = 92 * PX; // spritepaint 53 width
const STAGE_H = 92 * PX; // spritepaint 53 height
const DOOR_W = 21 * PX; // spritepaint 48 scaled down (~0.72x native)
const DOOR_H = 27 * PX;
const HATCH_W = 26 * PX; // spritepaint 49 scaled down (~0.74x native)
const HATCH_H = 33 * PX;

function useStageScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

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
  const [runStartMs, setRunStartMs] = useState<number | null>(null);
  const [skipCount, setSkipCount] = useState<number>(0);
  const [finalDurationMs, setFinalDurationMs] = useState<number>(0);

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
  const stageScale = useStageScale();

  // The first unfinished stage is the active door the player must enter.
  const FLAG_TO_DOOR: Record<(typeof STEP_ORDER)[number], OverlayType> = {
    powerKeys: 'keypad',
    sysCrashed: 'terminal',
    coreFixed: 'generator',
    powerRestored: 'wiring',
  };
  const nextFlag = STEP_ORDER.find((flag) => !progress[flag]);
  const activeDoorId = nextFlag ? FLAG_TO_DOOR[nextFlag] : null;

  // Judge failsafes: always clickable above overlays. SKIP advances one
  // stage, RESET restarts the whole run for the next demo.
  const skipStage = useCallback(() => {
    const next = STEP_ORDER.find((flag) => !progress[flag]);
    if (next) {
      complete(next);
      setSkipCount((n) => n + 1);
    }
    setActiveOverlay(null);
  }, [progress, complete]);

  const resetDemo = useCallback(() => {
    setProgress(EMPTY_PROGRESS);
    setEscaped(false);
    setActiveOverlay(null);
    setNotice(null);
    setRunStartMs(null);
    setSkipCount(0);
    setFinalDurationMs(0);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <button
        type="button"
        onClick={skipStage}
        aria-label="Skip stage"
        title="Skip stage"
        className="pixel-btn--sm fixed left-4 top-4 z-[80] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300 opacity-40 transition-opacity hover:opacity-100"
      >
        Skip
      </button>
      <button
        type="button"
        onClick={resetDemo}
        aria-label="Reset demo"
        title="Reset demo"
        className="pixel-btn--sm fixed right-16 top-4 z-[80] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300 opacity-40 transition-opacity hover:opacity-100"
      >
        Reset
      </button>
      <div className="relative" style={{ width: STAGE_W * stageScale, height: STAGE_H * stageScale }}>
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${stageScale})` }}
        >
          <img
            src="/assets/spritepaint 53.png"
            alt="Ship interior"
            draggable={false}
            className="absolute inset-0 select-none"
            style={{ imageRendering: 'pixelated', width: STAGE_W, height: STAGE_H }}
          />

          {/* Row of challenge doors along the back wall. The active door is
              highlighted, done doors show a green check, locked doors are
              greyed out and cannot be entered. */}
          {[
            { id: 'keypad', label: 'Access Codes', left: '8%' },
            { id: 'terminal', label: 'SYS Terminal', left: '30%' },
            { id: 'generator', label: 'Power Core', left: '52%' },
            { id: 'wiring', label: 'Wiring', left: '74%' },
          ].map(({ id, label, left }) => {
            const station = stations.find((s) => s.id === id);
            if (!station) return null;
            const isActive =
              station.unlocked && !station.done && id === activeDoorId;
            const isDone = station.done;
            const isLocked = !station.unlocked;
            return (
              <button
                key={id}
                type="button"
                onClick={() => openStation(station)}
                disabled={isLocked}
                aria-label={`${station.label} door`}
                title={`${station.label}${isDone ? ' ✓' : isLocked ? ' (no power)' : ''}`}
                className={`group absolute transition-all duration-200 ${
                  isActive
                    ? 'z-10 drop-shadow-[0_0_18px_rgba(250,204,21,0.65)]'
                    : ''
                } ${isLocked ? 'cursor-not-allowed brightness-[0.45] saturate-50' : 'cursor-pointer'}`}
                style={{ left, top: '14%', width: DOOR_W, height: DOOR_H }}
              >
                <img
                  src={isActive ? '/assets/spritepaint 49.png' : '/assets/spritepaint 48.png'}
                  alt=""
                  draggable={false}
                  className="h-full w-full select-none"
                  style={{ imageRendering: 'pixelated' }}
                />
                {isDone && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-black">
                    ✓
                  </span>
                )}
                <span
                  className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-sm border px-2 py-1 font-mono text-sm uppercase tracking-[0.2em] transition-opacity duration-150 ${
                    isLocked
                      ? 'border-zinc-600/40 bg-black/85 text-zinc-500 opacity-0 group-hover:opacity-100'
                      : 'border-yellow-400/40 bg-black/85 text-yellow-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}

          {/* Gold door (49) sprite reserved for the active door; escape is
              reached from the escape pod station after power is restored. */}

          {/* Escape pod hatch, bottom right on the floor. */}
          <button
            type="button"
            onClick={() => openStation(stations[4])}
            disabled={!stations[4].unlocked}
            aria-label="Escape pod hatch"
            title={`Escape Pod${stations[4].unlocked ? '' : ' (restore power first)'}`}
            className={`group absolute ${
              stations[4].unlocked
                ? 'cursor-pointer drop-shadow-[0_0_18px_rgba(74,222,128,0.55)]'
                : 'cursor-not-allowed brightness-[0.45] saturate-50'
            }`}
            style={{ left: '82%', top: '68%', width: HATCH_W, height: HATCH_H }}
          >
            <img
              src="/assets/spritepaint 49.png"
              alt=""
              draggable={false}
              className="h-full w-full select-none"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>

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
      </div>

      {activeOverlay && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/60 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveOverlay(null)}
            aria-label="Back to the bridge"
            className="pixel-btn--sm fixed right-4 top-4 z-[60] flex h-9 w-9 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-100"
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
              <KeypadMemoryGame
                onWin={() => {
                  setRunStartMs((prev) =>
                    prev === null ? Date.now() : prev,
                  );
                  complete('powerKeys');
                }}
              />
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
                setFinalDurationMs(
                  runStartMs === null ? 0 : Date.now() - runStartMs,
                );
                setEscaped(true);
              }}
            />
          )}
        </div>
      )}

      {escaped && (
        <EarthFinale
          durationMs={finalDurationMs}
          skipped={skipCount}
          onRestart={resetDemo}
        />
      )}
    </div>
  );
}

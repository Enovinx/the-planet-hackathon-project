import { useCallback, useEffect, useState } from 'react';
import KeypadMemoryGame from './memgame';
import Terminal from './terminal';
import EscapePod from './escapepod';
import GeneratorRepairPuzzle from './GeneratorRepairPuzzle';
import WiringPuzzle from './WiringPuzzle';
import VictoryScreen from './VictoryScreen';

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

/* Pixel-art stage: every sprite renders at exactly 15 CSS px per source
   pixel. The room background (spritepaint 44, 73x79) defines the stage size,
   and the doors (48, 49) are placed on it at their own native 15x sizes, so
   all art shares one pixel grid. The stage is uniformly scaled to the
   viewport, preserving that grid at every window size. */
const PX = 8; // CSS pixels per source pixel
const STAGE_W = 73 * PX; // 584 - spritepaint 44 width
const STAGE_H = 79 * PX; // 632 - spritepaint 44 height

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
            src="/assets/spritepaint 44.png"
            alt="Ship interior"
            draggable={false}
            className="absolute inset-0 select-none"
            style={{ imageRendering: 'pixelated', width: STAGE_W, height: STAGE_H }}
          />

          {/* Ship status schematic on the floor, left side. */}
          <div
            className="pointer-events-none absolute flex flex-col items-center"
            style={{ left: '4%', top: '72%', width: '17%' }}
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

          {/* Plain door (48): keypad station, native 435x570 at 15x. */}
          <button
            type="button"
            onClick={() => openStation(stations[1])}
            aria-label="Keypad door"
            title="Keypad"
            className="group absolute"
            style={{ left: '7%', top: '16%', width: 29 * PX, height: 38 * PX }}
          >
            <img
              src="/assets/spritepaint 48.png"
              alt=""
              draggable={false}
              className="h-full w-full select-none"
              style={{ imageRendering: 'pixelated' }}
            />
            {progress.powerKeys && (
              <span className="absolute inset-0 border-4 border-emerald-400/80" />
            )}
          </button>

          {/* Gold door (49): escape pod hatch, native 525x660 at 15x. */}
          <button
            type="button"
            onClick={() => openStation(stations[4])}
            aria-label="Escape pod hatch"
            title="Escape Pod"
            className={`group absolute ${progress.powerRestored ? '' : 'brightness-[0.55]'}`}
            style={{ left: '54%', top: '12%', width: 35 * PX, height: 44 * PX }}
          >
            <img
              src="/assets/spritepaint 49.png"
              alt=""
              draggable={false}
              className="h-full w-full select-none"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>

          {/* Wall/floor stations without dedicated sprites. */}
          {[
            { id: 0, left: '30%', top: '20%', width: '12%', height: '20%' },
            { id: 2, left: '34%', top: '74%', width: '18%', height: '16%' },
            { id: 3, left: '90%', top: '22%', width: '7%', height: '24%' },
          ].map(({ id, left, top, width, height }) => {
            const station = stations[id];
            return (
              <button
                key={station.id}
                type="button"
                onClick={() => openStation(station)}
                disabled={!station.unlocked}
                aria-label={station.label}
                title={station.label}
                style={{ left, top, width, height }}
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
            );
          })}

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
        <div className="fixed inset-0 z-50 overflow-auto bg-black/92">
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
        <VictoryScreen
          durationMs={finalDurationMs}
          skipped={skipCount}
          onRestart={resetDemo}
        />
      )}
    </div>
  );
}

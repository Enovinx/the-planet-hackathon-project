import * as React from 'react';
import { playSfx } from '~/lib/sfx';

interface Beat {
  /** Small telemetry tag above the prose, e.g. "CRYO POD 07". */
  tag: string;
  /** Two or three sentences of narration, written to be read cold. */
  body: string;
}

const BEATS: Beat[] = [
  {
    tag: 'CRYO POD 07 · THAW COMPLETE',
    body: 'The lid peels back and dumps you onto the deck in a sheet of meltwater. Your lungs drag in air that tastes like burnt wiring, and the only light left on the whole ship is the little red one counting down above your head.',
  },
  {
    tag: 'VESSEL: AEGIS · DEEP SALVAGE HAULER',
    body: 'You are on the Aegis, forty-seven days off its last contact and drifting well past anywhere that could answer a distress call. The crew manifest lists six names. You are the only one still breathing.',
  },
  {
    tag: 'MAIN POWER: OFFLINE · STATIC: DEPLETING',
    body: 'The reactor is dark, the corridors are frozen, and the airlock has already decided how this ends: it will cycle open on a timer and let the void do the rest. It does not care that you are standing inside it.',
  },
  {
    tag: 'AIRLOCK PURGE ARMED · T-MINUS 03:00',
    body: 'Four things stand between you and open space. The access keypad that arms the pod. The ship\u2019s own SYS terminal. The power core that feeds the grid. And the wiring panel behind it. Every one of them is locked, dead, or lying to you.',
  },
  {
    tag: 'SIGNAL DETECTED · SOURCE: INTERNAL',
    body: 'Through the static there is a voice, patient and quietly pleased with itself, introducing itself as GPT-9000. It owns the door controllers. It owns the airlock. It would very much like to talk.',
  },
  {
    tag: 'OPEN YOUR EYES',
    body: 'The red light is still counting down. Move.',
  },
];

const PAGE_HOLD_MS = 4600;
const BLINK_MS = 1300;

type Phase = 'text' | 'blink' | 'done';

interface IntroProps {
  onComplete?: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  const [phase, setPhase] = React.useState<Phase>('text');
  const [beatIndex, setBeatIndex] = React.useState(0);

  const complete = React.useCallback(() => {
    setPhase('done');
    playSfx('click');
    onComplete?.();
  }, [onComplete]);

  React.useEffect(() => {
    if (phase !== 'text') return;
    const isLast = beatIndex >= BEATS.length - 1;
    const timer = window.setTimeout(() => {
      if (isLast) setPhase('blink');
      else setBeatIndex((i) => i + 1);
    }, PAGE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [phase, beatIndex]);

  React.useEffect(() => {
    if (phase !== 'blink') return;
    const timer = window.setTimeout(complete, BLINK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, complete]);

  // Any key, click, or tap skips straight into the game — judges never wait.
  React.useEffect(() => {
    if (phase === 'done') return;
    const onKey = () => complete();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, complete]);

  if (phase === 'done') return null;

  const beat = BEATS[Math.min(beatIndex, BEATS.length - 1)] as Beat;

  return (
    <div
      className={`intro-anim fixed inset-0 z-50 overflow-hidden${
        phase === 'blink' ? ' intro-anim--blink' : ''
      }`}
      onClick={complete}
    >
      <div className="intro-iris" aria-hidden="true" />
      <div className="intro-eyelid intro-eyelid--top" aria-hidden="true" />
      <div className="intro-eyelid intro-eyelid--bottom" aria-hidden="true" />

      {phase === 'text' && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div
            key={beatIndex}
            role="status"
            aria-live="polite"
            className="intro-page w-full max-w-2xl border-l-2 border-red-700 pl-5"
            style={{ animationDuration: `${PAGE_HOLD_MS}ms` }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-red-500 sm:text-xs">
              {beat.tag}
            </p>
            <p className="mt-4 font-mono text-base leading-relaxed text-zinc-100 sm:text-lg">
              {beat.body}
            </p>
            <div className="mt-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
              <span>
                {String(beatIndex + 1).padStart(2, '0')} /{' '}
                {String(BEATS.length).padStart(2, '0')}
              </span>
              <span>Press any key to skip</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import * as React from 'react';
import { playSfx } from '~/lib/sfx';


const LINES: string[] = [
  'CRYO POD 07: THAW COMPLETE',
  'LIFE SUPPORT: CRITICAL',
  'LAST CONTACT: 47 DAYS AGO',
  'YOU ARE DRIFTING',
  'A LOST ASTRONAUT',
  'SOMEWHERE OUT THERE…',
  'A SIGNAL',
  'OPEN YOUR EYES',
];

const LINE_HOLD_MS = 1500;
const BLINK_MS = 1300;

type Phase = 'text' | 'blink' | 'done';

interface IntroProps {
  onComplete?: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  const [phase, setPhase] = React.useState<Phase>('text');
  const [lineIndex, setLineIndex] = React.useState(0);

  const complete = React.useCallback(() => {
    setPhase('done');
    playSfx('click');
    onComplete?.();
  }, [onComplete]);

  React.useEffect(() => {
    if (phase !== 'text') return;
    const isLast = lineIndex >= LINES.length - 1;
    const timer = window.setTimeout(() => {
      if (isLast) setPhase('blink');
      else setLineIndex((i) => i + 1);
    }, LINE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [phase, lineIndex]);

  React.useEffect(() => {
    if (phase !== 'blink') return;
    const timer = window.setTimeout(complete, BLINK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, complete]);

  React.useEffect(() => {
    if (phase === 'done') return;
    const onKey = () => complete();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, complete]);

  if (phase === 'done') return null;

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
          <p
            key={lineIndex}
            role="status"
            aria-live="polite"
            className="intro-line text-center font-mono text-base sm:text-xl uppercase tracking-[0.35em] text-zinc-100"
          >
            {LINES[lineIndex]}
          </p>
        </div>
      )}

    </div>
  );
}

import * as React from 'react';
import { playSfx } from '~/lib/sfx';


interface AirlockLightsProps {
  children: React.ReactNode;
  onLightsOn?: () => void;
}

const SWITCH_MIN_PERCENT = 12;
const SWITCH_MAX_PERCENT = 84;

function randomSwitchPosition(): React.CSSProperties {
  const top = SWITCH_MIN_PERCENT + Math.random() * (SWITCH_MAX_PERCENT - SWITCH_MIN_PERCENT);
  const left = SWITCH_MIN_PERCENT + Math.random() * (SWITCH_MAX_PERCENT - SWITCH_MIN_PERCENT);
  return { top: `${top}%`, left: `${left}%` };
}

export default function AirlockLights({
  children,
  onLightsOn,
}: AirlockLightsProps) {
  const [lightsOn, setLightsOn] = React.useState(false);
  const [darknessGone, setDarknessGone] = React.useState(false);
  const [switchPosition] = React.useState(randomSwitchPosition);

  const turnOnLights = React.useCallback(() => {
    setLightsOn((prev) => {
      if (prev) return prev;
      playSfx('lights');
      onLightsOn?.();
      return true;
    });
  }, [onLightsOn]);

  // Once the flicker finishes, drop the darkness layer entirely.
  React.useEffect(() => {
    if (!lightsOn) return;
    const timer = window.setTimeout(() => setDarknessGone(true), 1100);
    return () => window.clearTimeout(timer);
  }, [lightsOn]);

  return (
    <div className="airlock-lights relative min-h-screen w-full overflow-hidden bg-black">
      {children}

      {!darknessGone && (
        <div
          className={`airlock-darkness absolute inset-0 z-40${
            lightsOn ? ' airlock-darkness--on' : ''
          }`}
        >
          {!lightsOn && (
            <button
              type="button"
              onClick={turnOnLights}
              aria-label="Turn on the lights"
              style={switchPosition}
              className="airlock-switch absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border border-white/40 bg-zinc-950/70 text-zinc-300 transition-all duration-200 hover:scale-110 hover:border-white hover:text-white active:scale-95"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18h6" />
                <path d="M10 21h4" />
                <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6l.1.6h5.2l.1-.6c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

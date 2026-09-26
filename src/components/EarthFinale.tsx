import { useEffect, useState } from 'react';
// NOTE: durationMs/skipped props intentionally unused — stats lines removed per user request.

/**
 * Drop the earth-and-ship artwork at this path when it is uploaded and the
 * finale picks it up automatically. Until then a composed placeholder
 * backdrop (stars + earth disc + ship silhouette) is shown.
 */
const EARTH_SHIP_SRC = '/assets/finale/earth-ship.png';

interface EarthFinaleProps {
  onRestart: () => void;
  durationMs: number;
  skipped: number;
}

export default function EarthFinale({
  onRestart,
}: EarthFinaleProps) {
  const [hasArt, setHasArt] = useState(false);

  // Swap the placeholder out as soon as the real artwork exists.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasArt(true);
    img.src = EARTH_SHIP_SRC;
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black font-mono text-white">
      {/* Backdrop: real art when present, composed placeholder otherwise. */}
      {hasArt ? (
        <img
          src={EARTH_SHIP_SRC}
          alt="Earth and the escape ship"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0">
          {/* Starfield */}
          {Array.from({ length: 90 }, (_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${(i * 37.7) % 100}%`,
                top: `${(i * 53.3) % 100}%`,
                width: i % 7 === 0 ? 3 : 2,
                height: i % 7 === 0 ? 3 : 2,
                opacity: 0.25 + ((i * 13) % 60) / 100,
              }}
            />
          ))}
          {/* Earth */}
          <div
            className="absolute rounded-full"
            style={{
              right: '-12%',
              bottom: '-28%',
              width: '58vmin',
              height: '58vmin',
              background:
                'radial-gradient(circle at 32% 30%, #7dd3fc 0%, #2563eb 38%, #1e3a8a 68%, #0b1a4a 100%)',
              boxShadow: '0 0 90px rgba(96,165,250,0.5)',
            }}
          >
            {/* Landmass blobs */}
            <span className="absolute left-[18%] top-[22%] h-[14%] w-[26%] rounded-[45%] bg-emerald-500/70" />
            <span className="absolute left-[46%] top-[48%] h-[18%] w-[30%] rounded-[45%] bg-emerald-500/60" />
            <span className="absolute left-[24%] top-[62%] h-[10%] w-[18%] rounded-[45%] bg-emerald-500/50" />
            {/* Cloud swirls */}
            <span className="absolute left-[30%] top-[12%] h-[8%] w-[34%] rounded-full bg-white/35" />
            <span className="absolute left-[14%] top-[44%] h-[7%] w-[28%] rounded-full bg-white/25" />
          </div>
          {/* Ship silhouette flying toward the upper left */}
          <svg
            className="absolute"
            style={{ left: '22%', top: '24%', width: '16vmin' }}
            viewBox="0 0 64 40"
            fill="none"
          >
            <path
              d="M2 22 L26 14 L52 16 L60 20 L52 26 L26 28 Z"
              fill="#d4d4d8"
            />
            <path d="M26 14 L34 4 L44 6 L52 16 Z" fill="#a1a1aa" />
            <path d="M26 28 L34 36 L44 34 L52 26 Z" fill="#a1a1aa" />
            <circle cx="46" cy="20" r="3.4" fill="#38bdf8" />
            <path d="M2 22 L-8 20 L-8 24 Z" fill="#f59e0b" />
          </svg>
        </div>
      )}

      {/* Foreground panel */}
      <div className="relative z-10 flex flex-col items-center gap-3 bg-black/70 px-10 py-8 text-center backdrop-blur-sm">
        <h1 className="animate-pulse text-4xl font-bold uppercase tracking-[0.3em] text-emerald-400 sm:text-6xl">
          Homebound
        </h1>
        <button
          type="button"
          onClick={onRestart}
          className="pixel-btn mt-4 px-8 py-3 text-sm font-bold uppercase tracking-widest text-black"
        >
          Play again
        </button>
      </div>
    </div>
  );
}

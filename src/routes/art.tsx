import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/art')({
  component: ArtPage,
});

const SCALE = 8; // 1 source pixel = 8 CSS pixels, identical for every sprite

const SPRITES = [
  'spritepaint 41.png',
  'spritepaint 43.png',
  'spritepaint 44.png',
  'spritepaint 45.png',
  'spritepaint 48.png',
  'spritepaint 49.png',
];

function SpriteCard({ file }: { file: string }) {
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(
    null,
  );
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

  return (
    <figure className="flex shrink-0 flex-col items-center gap-3">
      <div className="art-checker inline-block p-3">
        <img
          ref={imgRef}
          src={`/assets/${encodeURIComponent(file)}`}
          alt={file}
          draggable={false}
          className="block max-w-none"
          style={{
            imageRendering: 'pixelated',
            width: natural ? natural.w * SCALE : undefined,
          }}
          onLoad={() => {
            const img = imgRef.current;
            if (img && img.naturalWidth > 0) {
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
        />
      </div>
      <figcaption className="text-center font-mono text-xs text-zinc-400">
        <div className="font-bold text-zinc-200">{file}</div>
        {natural && (
          <div className="tabular-nums">
            {natural.w}×{natural.h}px source → {natural.w * SCALE}×
            {natural.h * SCALE}px @ {SCALE}×
          </div>
        )}
      </figcaption>
    </figure>
  );
}

function ArtPage() {
  return (
    <main className="min-h-screen bg-zinc-950 p-8">
      <style>{`
        .art-checker {
          background-image:
            linear-gradient(45deg, #27272a 25%, transparent 25%),
            linear-gradient(-45deg, #27272a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #27272a 75%),
            linear-gradient(-45deg, transparent 75%, #27272a 75%);
          background-size: 30px 30px;
          background-position: 0 0, 0 15px, 15px -15px, -15px 0;
          background-color: #18181b;
        }
      `}</style>
      <h1 className="mb-1 font-mono text-lg font-bold uppercase tracking-[0.3em] text-zinc-100">
        Pixel Art — cleaned
      </h1>
      <p className="mb-8 font-mono text-xs text-zinc-500">
        White background removed (transparent), cropped to colored bounds.
        Rendered at {SCALE} CSS px per source pixel, image-rendering: pixelated.
      </p>
      <div className="flex flex-wrap items-start gap-10">
        {SPRITES.map((file) => (
          <SpriteCard key={file} file={file} />
        ))}
      </div>
    </main>
  );
}

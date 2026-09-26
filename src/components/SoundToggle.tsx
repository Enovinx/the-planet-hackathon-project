import { useMuted } from '~/lib/sfx';

export default function SoundToggle() {
  const { muted, toggle } = useMuted();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      title={muted ? 'Unmute sound' : 'Mute sound'}
      className="fixed right-4 top-4 z-[70] flex h-9 w-9 items-center justify-center border border-zinc-700 bg-black/80 font-mono text-sm text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-100"
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="m22 9-6 6" />
          <path d="m16 9 6 6" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.6 5.4a9 9 0 0 1 0 13.2" />
        </svg>
      )}
    </button>
  );
}

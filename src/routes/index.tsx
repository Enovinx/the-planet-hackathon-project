import * as React from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import Intro from '~/components/Intro';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [awake, setAwake] = React.useState(false);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 bg-black px-6 text-center text-zinc-200">
      <div
        className={`flex flex-col items-center gap-5 transition-opacity duration-1000 ${
          awake ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-zinc-500">
          The Planet
        </p>
        <h1 className="text-4xl font-bold uppercase tracking-[0.2em] sm:text-5xl">
          Lost Astronaut
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
          Signal acquired · pod systems offline
        </p>
        <Link
          to="/repair"
          className="mt-4 border border-zinc-700 px-8 py-3 font-mono text-xs uppercase tracking-[0.3em] text-zinc-200 transition-colors hover:border-zinc-400 hover:bg-zinc-900"
        >
          Restore power
        </Link>
      </div>

      <Intro onComplete={() => setAwake(true)} />
    </main>
  );
}

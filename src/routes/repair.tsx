import { Link, createFileRoute } from '@tanstack/react-router';
import GeneratorRepairPuzzle from '~/components/GeneratorRepairPuzzle';

export const Route = createFileRoute('/repair')({
  component: RepairPage,
});

function RepairPage() {
  return (
    <main className="min-h-screen bg-black p-6 flex flex-col items-center gap-6">
      <Link
        to="/"
        aria-label="back"
        className="w-9 h-9 flex items-center justify-center rounded border border-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
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
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        </svg>
      </Link>
      <GeneratorRepairPuzzle />
    </main>
  );
}

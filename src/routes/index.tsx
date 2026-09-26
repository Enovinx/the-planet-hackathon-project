import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import Intro from '~/components/Intro';
import AirlockLights from '~/components/AirlockLights';
import AirlockRoom from '~/components/airlockroom';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [awake, setAwake] = React.useState(false);

  return (
    <main className="relative min-h-screen w-screen overflow-hidden bg-black">
      <AirlockLights>
        <AirlockRoom />
      </AirlockLights>

      {!awake && <Intro onComplete={() => setAwake(true)} />}
    </main>
  );
}

import { useState } from 'react';

export const useAudio = (url: string): () => void => {
  const [audio] = useState<HTMLAudioElement>(new Audio(url));

  const playFromStart = (): void => {
    audio.currentTime = 0;
    audio.play().catch((err: Error) => console.warn("Audio blocked by browser:", err));
  };

  return playFromStart;
};

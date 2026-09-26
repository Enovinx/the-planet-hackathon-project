import { useState } from 'react';

/**
 * A custom hook to effortlessly play sound effects.
 * 
 * @param url - The path or URL to the audio file.
 * @returns A function that resets and plays the audio from the start.
 */
export const useAudio = (url: string): () => void => {
  const [audio] = useState<HTMLAudioElement>(new Audio(url));

  // Browsers sometimes block audio if the user hasn't clicked anything yet;
  // the catch keeps the app from crashing when that happens.
  const playFromStart = (): void => {
    audio.currentTime = 0;
    audio.play().catch((err: Error) => console.warn("Audio blocked by browser:", err));
  };

  return playFromStart;
};

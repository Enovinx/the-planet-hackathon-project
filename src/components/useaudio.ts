import { useState } from 'react';

/**
 * A custom hook to effortlessly play sound effects.
 * 
 * @param url - The path or URL to the audio file.
 * @returns A function that resets and plays the audio from the start.
 */
export const useAudio = (url: string): () => void => {
  const [audio] = useState<HTMLAudioElement>(new Audio(url));

  const play = (): void => {
    // Browsers sometimes block audio if the user hasn't clicked anything yet
    // The catch block prevents the app from crashing if that happens
    audio.play().catch((err: Error) => console.warn("Audio blocked by browser:", err));
  };

  // Optional: Reset audio to start if you want to play it rapidly multiple times
  const playFromStart = (): void => {
    audio.currentTime = 0;
    audio.play().catch((err: Error) => console.warn("Audio blocked by browser:", err));
  };

  return playFromStart;
};

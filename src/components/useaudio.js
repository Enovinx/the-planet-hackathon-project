import { useState, useEffect } from 'react';

// A custom hook to effortlessly play sound effects
export const useAudio = (url) => {
  const [audio] = useState(new Audio(url));

  const play = () => {
    // Browsers sometimes block audio if the user hasn't clicked anything yet
    // The catch block prevents the app from crashing if that happens
    audio.play().catch(err => console.warn("Audio blocked by browser:", err));
  };

  // Optional: Reset audio to start if you want to play it rapidly multiple times
  const playFromStart = () => {
    audio.currentTime = 0;
    audio.play().catch(err => console.warn("Audio blocked by browser:", err));
  };

  return playFromStart;
};
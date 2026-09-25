import React, { useState, useEffect } from 'react';

export default function Keypad({ onUnlock }) {
  const [sequence, setSequence] = useState([1, 5, 9, 4]); // The secret code
  const [playerInput, setPlayerInput] = useState([]);
  const [status, setStatus] = useState("ENTER OVERRIDE CODE");
  const [isError, setIsError] = useState(false);

  // Checks the player's input every time they press a button
  useEffect(() => {
    if (playerInput.length === sequence.length) {
      if (playerInput.join('') === sequence.join('')) {
        setStatus("ACCESS GRANTED");
        // Wait 1 second, then tell the main app the game is won
        setTimeout(() => onUnlock(), 1000); 
      } else {
        setStatus("RADIATION SICKNESS DETECTED. INCORRECT.");
        setIsError(true);
        setTimeout(() => {
          setPlayerInput([]);
          setStatus("ENTER OVERRIDE CODE");
          setIsError(false);
        }, 1500);
      }
    }
  }, [playerInput, sequence, onUnlock]);

  const handlePress = (num) => {
    if (playerInput.length < sequence.length) {
      setPlayerInput([...playerInput, num]);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono selection:bg-none">
      
      {/* Narrative header */}
      <div className="max-w-md text-center mb-8 text-yellow-500">
        <h1 className="text-3xl font-bold mb-2 text-red-600 animate-pulse">WARNING: RADIATION CRITICAL</h1>
        <p className="text-sm">Your memory is fading. Enter the master override sequence before the AI drains your suit.</p>
      </div>

      <div className={`p-8 border-4 bg-zinc-900 shadow-[8px_8px_0px_#000] ${isError ? 'border-red-600 shadow-red-900' : 'border-yellow-600 shadow-yellow-900'}`}>
        
        {/* Display Screen */}
        <div className={`w-full h-16 bg-black border-2 mb-6 flex items-center justify-center text-xl font-bold ${isError ? 'text-red-500 border-red-500' : 'text-yellow-500 border-yellow-500'}`}>
          {playerInput.length > 0 ? '* '.repeat(playerInput.length) : status}
        </div>

        {/* 3x3 Keypad Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePress(num)}
              className="w-20 h-20 bg-zinc-800 border-2 border-yellow-700 text-yellow-500 text-3xl font-bold hover:bg-yellow-600 hover:text-black active:translate-y-1 active:translate-x-1 active:shadow-none transition-all shadow-[4px_4px_0px_rgba(202,138,4,0.5)]"
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import Keypad from './Keypad';
import Terminal from './Terminal';
import EscapePod from './EscapePod';

export type OverlayType = 'keypad' | 'terminal' | 'wiring' | 'escape' | null;

export interface AirlockProgress {
  keypadUnlocked: boolean;
  terminalCrashed: boolean;
  powerRestored: boolean;
}

export default function AirlockRoom() {
  // Manages which overlay is currently open
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);

  // Manages the player's progression through the story
  const [progress, setProgress] = useState<AirlockProgress>({
    keypadUnlocked: false,
    terminalCrashed: false,
    powerRestored: false,
  });

  // Base styling for the interactive glowing hotspots
  const hotspotClass =
    'absolute cursor-pointer border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.7)] animate-pulse hover:bg-yellow-500/30 transition-all z-10 focus:outline-none';

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden selection:bg-none">
      {/* 
        TODO for your Prompt Engineers: 
        Replace this placeholder with the actual 2D Airlock background image they find 
      */}
      <div
        className="absolute inset-0 bg-zinc-900 bg-cover bg-center opacity-80"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1628126235206-5260b9ea6441?q=80&w=2000&auto=format&fit=crop')",
        }}
      />

      {/* --- HOTSPOTS --- */}

      {/* 1. Keypad Hotspot (Always clickable until unlocked) */}
      {!progress.keypadUnlocked && (
        <button
          type="button"
          className={hotspotClass}
          style={{ top: '40%', left: '20%', width: '60px', height: '80px' }}
          onClick={() => setActiveOverlay('keypad')}
          title="Access Keypad"
          aria-label="Access Keypad"
        />
      )}

      {/* 2. Terminal Hotspot (Only clickable AFTER Keypad is unlocked, disappears after crashed) */}
      {progress.keypadUnlocked && !progress.terminalCrashed && (
        <button
          type="button"
          className={hotspotClass}
          style={{ top: '45%', left: '50%', width: '120px', height: '90px' }}
          onClick={() => setActiveOverlay('terminal')}
          title="Main Terminal"
          aria-label="Main Terminal"
        />
      )}

      {/* 3. Wiring Panel Hotspot (Only appears AFTER Terminal crashes) */}
      {progress.terminalCrashed && !progress.powerRestored && (
        <button
          type="button"
          className={`${hotspotClass} border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]`}
          style={{ top: '30%', left: '80%', width: '100px', height: '150px' }}
          onClick={() => setActiveOverlay('wiring')}
          title="Broken Wiring Panel"
          aria-label="Broken Wiring Panel"
        />
      )}

      {/* 4. Escape Pod Door (Appears AFTER power is restored) */}
      {progress.powerRestored && (
        <button
          type="button"
          className={`${hotspotClass} border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.9)]`}
          style={{ top: '20%', left: '40%', width: '200px', height: '300px' }}
          onClick={() => setActiveOverlay('escape')}
          title="Enter Escape Pod"
          aria-label="Enter Escape Pod"
        />
      )}

      {/* --- MASSIVE OVERLAYS (Minigames) --- */}

      {activeOverlay === 'keypad' && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <Keypad
            onUnlock={() => {
              setProgress((prev) => ({ ...prev, keypadUnlocked: true }));
              setActiveOverlay(null); // Close overlay on win
            }}
          />
        </div>
      )}

      {activeOverlay === 'terminal' && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <Terminal
            onCrash={() => {
              setProgress((prev) => ({ ...prev, terminalCrashed: true }));
              setActiveOverlay(null);
            }}
          />
        </div>
      )}

      {activeOverlay === 'wiring' && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          {/* Enovinx needs to drop his wiring component here! */}
          <div className="text-white text-center">
            <h2 className="text-2xl mb-4 text-yellow-500">ENOVINX WIRING GAME GOES HERE</h2>
            <button
              type="button"
              className="p-4 bg-red-600 text-black font-bold hover:bg-red-500 transition-colors"
              onClick={() => {
                setProgress((prev) => ({ ...prev, powerRestored: true }));
                setActiveOverlay(null);
              }}
            >
              [DEV SKIP: WIN WIRING]
            </button>
          </div>
        </div>
      )}

      {activeOverlay === 'escape' && (
        <div className="fixed inset-0 z-50 bg-black text-center">
          <EscapePod onWin={() => alert('YOU WIN THE HACKATHON!')} />
        </div>
      )}
    </div>
  );
}
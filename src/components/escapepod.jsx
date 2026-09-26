import React, { useRef, useEffect, useState } from 'react';

export default function EscapePod({ onWin }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("START"); // START, PLAYING, GAME_OVER, WIN
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Game Entities
    let player = { x: 275, y: 350, width: 30, height: 30, speed: 5, dx: 0 };
    let bullets = [];
    let asteroids = [];
    let frameCount = 0;

    // Controls
    const keys = { ArrowLeft: false, ArrowRight: false, Space: false };

    const handleKeyDown = (e) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') keys.ArrowRight = true;
      if (e.code === 'Space') {
        if (!keys.Space) bullets.push({ x: player.x + 12, y: player.y, width: 6, height: 15, speed: 7 });
        keys.Space = true;
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
      if (e.code === 'ArrowRight') keys.ArrowRight = false;
      if (e.code === 'Space') keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Main Game Loop
    const update = () => {
      frameCount++;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Move & Draw Player (Triangle)
      if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
      if (keys.ArrowRight && player.x + player.width < canvas.width) player.x += player.speed;
      
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(player.x + 15, player.y);
      ctx.lineTo(player.x + 30, player.y + 30);
      ctx.lineTo(player.x, player.y + 30);
      ctx.fill();

      // 2. Spawn, Move & Draw Asteroids
      if (frameCount % 30 === 0) { // Spawn rate
        asteroids.push({
          x: Math.random() * (canvas.width - 30),
          y: -30,
          width: 30,
          height: 30,
          speed: 2 + Math.random() * 3
        });
      }

      asteroids.forEach((ast, aIndex) => {
        ast.y += ast.speed;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(ast.x, ast.y, ast.width, ast.height);
        
        // Brutalist inner border for asteroids
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(ast.x, ast.y, ast.width, ast.height);

        // Player collision check
        if (player.x < ast.x + ast.width && player.x + player.width > ast.x &&
            player.y < ast.y + ast.height && player.height + player.y > ast.y) {
          setGameState("GAME_OVER");
        }
      });

      // 3. Move & Draw Bullets
      bullets.forEach((bullet, bIndex) => {
        bullet.y -= bullet.speed;
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        // Bullet hitting asteroid check
        asteroids.forEach((ast, aIndex) => {
          if (bullet.x < ast.x + ast.width && bullet.x + bullet.width > ast.x &&
              bullet.y < ast.y + ast.height && bullet.height + bullet.y > ast.y) {
            asteroids.splice(aIndex, 1);
            bullets.splice(bIndex, 1);
          }
        });
      });

      // Cleanup off-screen entities
      bullets = bullets.filter(b => b.y > 0);
      asteroids = asteroids.filter(a => a.y < canvas.height);

      if (gameState === "PLAYING") {
        animationFrameId = requestAnimationFrame(update);
      }
    };

    update(); // Start loop

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  // Timer Countdown Logic
  useEffect(() => {
    let timer;
    if (gameState === "PLAYING" && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === "PLAYING") {
      setGameState("WIN");
      setTimeout(() => onWin(), 3000); // Trigger victory screen after 3 seconds
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, onWin]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-white selection:bg-none">
      
      {/* UI Overlay */}
      <div className="w-full max-w-[600px] flex justify-between items-center mb-4 border-b-4 border-zinc-700 pb-2">
        <h2 className="text-2xl font-bold text-yellow-500 uppercase tracking-widest">Pod Navigation</h2>
        <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
          T-MINUS: {timeLeft}s
        </div>
      </div>

      {/* The Game Canvas - Brutalist styling */}
      <div className="relative border-4 border-zinc-500 bg-zinc-950 shadow-[8px_8px_0px_#3f3f46]">
        
        {/* Game Over / Start Screens Overlay */}
        {gameState !== "PLAYING" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 p-8 text-center">
            {gameState === "START" && (
              <>
                <h1 className="text-3xl text-yellow-500 font-bold mb-4">RADIATION DEBRIS FIELD</h1>
                <p className="mb-6 text-zinc-400">Use LEFT/RIGHT arrows to move. SPACE to fire lasers.</p>
                <button onClick={() => setGameState("PLAYING")} className="px-6 py-3 bg-green-600 text-black font-bold text-xl hover:bg-green-500 border-2 border-green-400 shadow-[4px_4px_0px_#000]">
                  INITIATE LAUNCH
                </button>
              </>
            )}
            {gameState === "GAME_OVER" && (
              <>
                <h1 className="text-4xl text-red-600 font-bold mb-4">HULL BREACH</h1>
                <button onClick={() => { setGameState("START"); setTimeLeft(20); }} className="px-6 py-3 bg-red-900 text-white font-bold text-xl hover:bg-red-700 border-2 border-red-500 shadow-[4px_4px_0px_#000]">
                  REBOOT SYSTEMS
                </button>
              </>
            )}
            {gameState === "WIN" && (
              <>
                <h1 className="text-4xl text-green-500 font-bold mb-4 animate-pulse">CLEARED DEBRIS FIELD</h1>
                <p className="text-xl text-yellow-500">RESCUE FLEET REACHED.</p>
              </>
            )}
          </div>
        )}

        {/* The actual HTML5 Canvas */}
        <canvas ref={canvasRef} width={600} height={400} className="block" />
      </div>
    </div>
  );
}
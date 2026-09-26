import { useRef, useEffect, useState } from 'react';
import { playSfx } from '~/lib/sfx';

export type GameState = 'START' | 'PLAYING' | 'GAME_OVER' | 'WIN';

interface EscapePodProps {
  onWin?: () => void;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  dx: number;
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Asteroid {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface KeyState {
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Space: boolean;
}

const ROCKET_SRC = '/assets/spritepaint 45.png';
const ASTEROID_SRC = '/assets/spritepaint 43.png';

export default function EscapePod({ onWin }: EscapePodProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [timeLeft, setTimeLeft] = useState<number>(3);
  const spritesRef = useRef<{ rocket?: HTMLImageElement; asteroid?: HTMLImageElement }>({});

  useEffect(() => {
    const rocket = new Image();
    rocket.src = ROCKET_SRC;
    const asteroid = new Image();
    asteroid.src = ASTEROID_SRC;
    spritesRef.current = { rocket, asteroid };
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isRunning = true;
    ctx.imageSmoothingEnabled = false;

    const player: Player = { x: 275, y: 350, width: 30, height: 30, speed: 5, dx: 0 };
    let bullets: Bullet[] = [];
    let asteroids: Asteroid[] = [];
    let frameCount = 0;

    interface Star {
      x: number;
      y: number;
      speed: number;
      size: number;
    }
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
      size: number;
    }
    const stars: Star[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.5 + Math.random() * 2,
      size: Math.random() < 0.2 ? 2 : 1,
    }));
    let particles: Particle[] = [];
    let shake = 0;

    const burst = (
      x: number,
      y: number,
      color: string,
      count: number,
      power: number,
    ): void => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = (0.5 + Math.random()) * power;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          life: 20 + Math.random() * 20,
          maxLife: 40,
          color,
          size: 1 + Math.random() * 3,
        });
      }
    };

    const keys: KeyState = { ArrowLeft: false, ArrowRight: false, Space: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') keys.ArrowRight = true;
      if (e.code === 'Space') {
        if (!keys.Space) {
          bullets.push({ x: player.x + 12, y: player.y, width: 6, height: 15, speed: 7 });
          playSfx('shoot');
        }
        keys.Space = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
      if (e.code === 'ArrowRight') keys.ArrowRight = false;
      if (e.code === 'Space') keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      if (!isRunning) return;

      frameCount++;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (shake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * shake,
          (Math.random() - 0.5) * shake,
        );
        shake *= 0.88;
        if (shake < 0.5) shake = 0;
      }

      ctx.fillStyle = '#ffffff';
      for (const star of stars) {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = -2;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
      if (keys.ArrowRight && player.x + player.width < canvas.width) player.x += player.speed;

      const rocket = spritesRef.current.rocket;
      if (rocket && rocket.complete && rocket.naturalWidth > 0) {
        ctx.drawImage(rocket, player.x + 15 - 55 / 2, player.y + 30 - 74, 55, 74);
      } else {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(player.x + 15, player.y);
        ctx.lineTo(player.x + 30, player.y + 30);
        ctx.lineTo(player.x, player.y + 30);
        ctx.closePath();
        ctx.fill();
      }

      if (frameCount % 45 === 0) {
        asteroids.push({
          x: Math.random() * (canvas.width - 30),
          y: -30,
          width: 30,
          height: 30,
          speed: 1.5 + Math.random() * 2,
        });
      }

      for (let i = 0; i < asteroids.length; i++) {
        const ast = asteroids[i];
        ast.y += ast.speed;

        const asteroid = spritesRef.current.asteroid;
        if (asteroid && asteroid.complete && asteroid.naturalWidth > 0) {
          ctx.drawImage(asteroid, ast.x, ast.y, 30, 30);
        } else {
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(ast.x, ast.y, ast.width, ast.height);
        }

        if (
          player.x < ast.x + ast.width &&
          player.x + player.width > ast.x &&
          player.y < ast.y + ast.height &&
          player.height + player.y > ast.y
        ) {
          isRunning = false;
          burst(player.x + 15, player.y + 15, '#ff6600', 24, 4);
          burst(player.x + 15, player.y + 15, '#ffff00', 12, 3);
          shake = 14;
          playSfx('explode');
          setGameState('GAME_OVER');
          return;
        }
      }

      for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
        const bullet = bullets[bIndex];
        bullet.y -= bullet.speed;

        ctx.fillStyle = '#ffff00';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        for (let aIndex = asteroids.length - 1; aIndex >= 0; aIndex--) {
          const ast = asteroids[aIndex];
          if (
            bullet.x < ast.x + ast.width &&
            bullet.x + bullet.width > ast.x &&
            bullet.y < ast.y + ast.height &&
            bullet.height + bullet.y > ast.y
          ) {
            asteroids.splice(aIndex, 1);
            bullets.splice(bIndex, 1);
            burst(ast.x + 15, ast.y + 15, '#ff3300', 14, 3);
            burst(ast.x + 15, ast.y + 15, '#ffffff', 5, 2);
            shake = 6;
            playSfx('explode');
            break;
          }
        }
      }

      bullets = bullets.filter((b) => b.y > 0);
      asteroids = asteroids.filter((a) => a.y < canvas.height);

      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      if (isRunning) {
        animationFrameId = requestAnimationFrame(update);
      }
    };

    update();

    return () => {
      isRunning = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      setGameState('WIN');
      playSfx('win');
      const winTimer = setTimeout(() => {
        onWin?.();
      }, 1200);
      return () => clearTimeout(winTimer);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, timeLeft, onWin]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-white selection:bg-none">
      <div className="w-full max-w-[600px] flex justify-between items-center mb-4 border-b-4 border-zinc-700 pb-2">
        <h2 className="text-2xl font-bold text-yellow-500 uppercase tracking-widest">Pod Navigation</h2>
        <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
          T-MINUS: {timeLeft}s
        </div>
      </div>

      {/* The Game Canvas - Brutalist styling */}
      <div className="relative border-4 border-zinc-500 bg-zinc-950 shadow-[8px_8px_0px_#3f3f46]">
        {/* Game Over / Start Screens Overlay */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 p-8 text-center">
            {gameState === 'START' && (
              <>
                <h1 className="text-3xl text-yellow-500 font-bold mb-4">RADIATION DEBRIS FIELD</h1>
                <p className="mb-6 text-lg font-bold text-zinc-100">Use LEFT/RIGHT arrows to move. SPACE to fire lasers.</p>
                <button
                  type="button"
                  onClick={() => setGameState('PLAYING')}
                  className="pixel-btn px-6 py-3 font-bold text-xl text-black"
                >
                  INITIATE LAUNCH
                </button>
              </>
            )}
            {gameState === 'GAME_OVER' && (
              <>
                <h1 className="text-4xl text-red-600 font-bold mb-4">HULL BREACH</h1>
                <button
                  type="button"
                  onClick={() => {
                    setGameState('START');
                    setTimeLeft(20);
                  }}
                  className="pixel-btn px-6 py-3 font-bold text-xl text-black"
                >
                  REBOOT SYSTEMS
                </button>
              </>
            )}
            {gameState === 'WIN' && (
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
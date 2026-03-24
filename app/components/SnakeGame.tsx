'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChiptunePlayer } from '../lib/chiptune';

interface SnakeGameProps {
  onBack: () => void;
  chiptune?: ChiptunePlayer | null;
}

// ── Constants ──────────────────────────────────────────────
const GRID_COLS = 20;
const GRID_ROWS = 18;
const BASE_SPEED = 120; // ms per move (~ 8 moves/sec)
const SPEED_INCREASE = 10; // ms faster per speed level
const FOODS_PER_LEVEL = 5;
const FOOD_SCORE = 10;

type Direction = 'up' | 'down' | 'left' | 'right';
type Point = { x: number; y: number };

// ── Color utilities ────────────────────────────────────────
function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

// ── Component ──────────────────────────────────────────────
export default function SnakeGame({ onBack, chiptune }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastMoveRef = useRef<number>(0);

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [, setScore] = useState(0);

  // Mutable game state via refs
  const snakeRef = useRef<Point[]>([{ x: 10, y: 9 }, { x: 9, y: 9 }, { x: 8, y: 9 }]);
  const dirRef = useRef<Direction>('right');
  const nextDirRef = useRef<Direction>('right');
  const foodRef = useRef<Point>({ x: 15, y: 9 });
  const scoreRef = useRef(0);
  const hiScoreRef = useRef(0);
  const speedLevelRef = useRef(1);
  const foodCountRef = useRef(0);
  const gameStateRef = useRef<'ready' | 'playing' | 'over'>('ready');

  // Sync state ref
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Load hi-score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snake_hi_score');
      if (saved) hiScoreRef.current = parseInt(saved, 10) || 0;
    } catch { /* ignore */ }
  }, []);

  const placeFood = useCallback(() => {
    const snake = snakeRef.current;
    const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
    let attempts = 0;
    let pos: Point;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS),
      };
      attempts++;
    } while (occupied.has(`${pos.x},${pos.y}`) && attempts < 200);
    foodRef.current = pos;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 9 }, { x: 9, y: 9 }, { x: 8, y: 9 }];
    dirRef.current = 'right';
    nextDirRef.current = 'right';
    scoreRef.current = 0;
    speedLevelRef.current = 1;
    foodCountRef.current = 0;
    setScore(0);
    placeFood();
    setGameState('playing');
    chiptune?.playStartSound();
    lastMoveRef.current = performance.now();
  }, [placeFood, chiptune]);

  const moveSnake = useCallback(() => {
    const snake = snakeRef.current;
    const dir = nextDirRef.current;
    dirRef.current = dir;

    const head = snake[0];
    let nx = head.x;
    let ny = head.y;

    switch (dir) {
      case 'up': ny--; break;
      case 'down': ny++; break;
      case 'left': nx--; break;
      case 'right': nx++; break;
    }

    // Wrap around walls
    if (nx < 0) nx = GRID_COLS - 1;
    if (nx >= GRID_COLS) nx = 0;
    if (ny < 0) ny = GRID_ROWS - 1;
    if (ny >= GRID_ROWS) ny = 0;

    // Check self-collision
    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === nx && snake[i].y === ny) {
        // Save hi-score
        if (scoreRef.current > hiScoreRef.current) {
          hiScoreRef.current = scoreRef.current;
          try { localStorage.setItem('snake_hi_score', String(hiScoreRef.current)); } catch { /* ignore */ }
        }
        setGameState('over');
        chiptune?.playGameOverSound();
        return;
      }
    }

    const newHead: Point = { x: nx, y: ny };
    snake.unshift(newHead);

    // Check food
    const food = foodRef.current;
    if (nx === food.x && ny === food.y) {
      foodCountRef.current++;
      const pts = FOOD_SCORE * speedLevelRef.current;
      scoreRef.current += pts;
      setScore(scoreRef.current);

      // Speed up every FOODS_PER_LEVEL
      if (foodCountRef.current % FOODS_PER_LEVEL === 0) {
        speedLevelRef.current++;
      }

      placeFood();
    } else {
      snake.pop();
    }
  }, [placeFood, chiptune]);

  // ── Drawing ────────────────────────────────────────────
  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = cw;
    const H = ch;

    // Layout calculations
    const topBarH = Math.round(H * 0.065);
    const bottomBarH = Math.round(H * 0.045);
    const playAreaH = H - topBarH - bottomBarH;
    const cellSize = Math.min(
      Math.floor(playAreaH / GRID_ROWS),
      Math.floor(W / GRID_COLS)
    );
    const fieldH = cellSize * GRID_ROWS;
    const fieldW = cellSize * GRID_COLS;
    const fieldX = Math.floor((W - fieldW) / 2);
    const fieldY = topBarH + Math.floor((playAreaH - fieldH) / 2);

    // ─── Background ───
    ctx.fillStyle = '#12091d';
    ctx.fillRect(0, 0, W, H);

    // ─── Top HUD Bar ───
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, topBarH);
    ctx.strokeStyle = 'rgba(100,60,150,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topBarH - 0.5);
    ctx.lineTo(W, topBarH - 0.5);
    ctx.stroke();

    const hudFontSize = Math.max(7, Math.floor(topBarH * 0.5));
    const hudY = Math.floor(topBarH / 2);

    // SCORE (left)
    ctx.font = `bold ${hudFontSize}px 'W95FA', monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b89830';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 4, hudY);
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(` ${scoreRef.current}`, 4 + ctx.measureText('SCORE').width, hudY);

    // SNAKE (center badge)
    const badgeText = 'SNAKE';
    const badgeWidth = ctx.measureText(badgeText).width + 10;
    const badgeX = Math.floor(W / 2 - badgeWidth / 2);
    ctx.fillStyle = 'rgba(40,80,50,0.3)';
    ctx.strokeStyle = 'rgba(68,187,102,0.5)';
    ctx.lineWidth = 1;
    const badgeH = hudFontSize + 4;
    const badgeY = hudY - badgeH / 2;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeH, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#66dd88';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, W / 2, hudY);

    // HI (right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b89830';
    const hiValStr = String(hiScoreRef.current);
    ctx.fillText('HI', W - 4 - ctx.measureText(hiValStr).width - 4, hudY);
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(hiValStr, W - 4, hudY);

    // ─── Play Field Border ───
    ctx.strokeStyle = 'rgba(100,60,150,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(fieldX - 0.5, fieldY - 0.5, fieldW + 1, fieldH + 1);

    // ─── Play Field Background ───
    ctx.fillStyle = '#0e0618';
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // Grid lines
    ctx.strokeStyle = 'rgba(100,60,150,0.10)';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(fieldX, fieldY + r * cellSize + 0.5);
      ctx.lineTo(fieldX + fieldW, fieldY + r * cellSize + 0.5);
      ctx.stroke();
    }
    for (let c = 1; c < GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(fieldX + c * cellSize + 0.5, fieldY);
      ctx.lineTo(fieldX + c * cellSize + 0.5, fieldY + fieldH);
      ctx.stroke();
    }

    // ─── Food ───
    if (gameStateRef.current === 'playing') {
      const food = foodRef.current;
      const fx = fieldX + food.x * cellSize;
      const fy = fieldY + food.y * cellSize;

      // Pulsing glow
      const pulse = Math.sin(timestamp / 200) * 0.3 + 0.7;
      const glowRadius = cellSize * 0.8 * pulse;
      const gradient = ctx.createRadialGradient(
        fx + cellSize / 2, fy + cellSize / 2, 0,
        fx + cellSize / 2, fy + cellSize / 2, glowRadius
      );
      gradient.addColorStop(0, 'rgba(204,51,85,0.4)');
      gradient.addColorStop(1, 'rgba(204,51,85,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(fx - cellSize * 0.3, fy - cellSize * 0.3, cellSize * 1.6, cellSize * 1.6);

      // Food block
      const inset = Math.max(1, Math.floor(cellSize * 0.2));
      ctx.fillStyle = '#cc3355';
      ctx.fillRect(fx + inset, fy + inset, cellSize - inset * 2, cellSize - inset * 2);
      // Highlight
      ctx.fillStyle = lightenColor('#cc3355', 40);
      ctx.fillRect(fx + inset, fy + inset, cellSize - inset * 2, Math.max(1, Math.floor(cellSize * 0.15)));
      // Darker outline
      ctx.strokeStyle = darkenColor('#cc3355', 50);
      ctx.lineWidth = 1;
      ctx.strokeRect(fx + inset + 0.5, fy + inset + 0.5, cellSize - inset * 2 - 1, cellSize - inset * 2 - 1);
    }

    // ─── Snake ───
    if (gameStateRef.current === 'playing' || gameStateRef.current === 'over') {
      const snake = snakeRef.current;
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const sx = fieldX + seg.x * cellSize;
        const sy = fieldY + seg.y * cellSize;
        const isHead = i === 0;
        const color = isHead ? '#66dd88' : '#44bb66';

        // Main fill
        ctx.fillStyle = color;
        ctx.fillRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);

        // Darker outline
        ctx.strokeStyle = darkenColor(color, 50);
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, cellSize - 1, cellSize - 1);

        // Inner highlight (top-left)
        const hl = Math.max(1, Math.floor(cellSize * 0.15));
        ctx.fillStyle = lightenColor(color, 35);
        ctx.fillRect(sx + 1, sy + 1, cellSize - 2, hl);
        ctx.fillRect(sx + 1, sy + 1, hl, cellSize - 2);

        // Inner shadow (bottom-right)
        ctx.fillStyle = darkenColor(color, 30);
        ctx.fillRect(sx + 1, sy + cellSize - 1 - hl, cellSize - 2, hl);
        ctx.fillRect(sx + cellSize - 1 - hl, sy + 1, hl, cellSize - 2);

        // Eyes on head
        if (isHead && cellSize >= 6) {
          const dir = dirRef.current;
          const eyeSize = Math.max(1, Math.floor(cellSize * 0.15));
          const cx = sx + cellSize / 2;
          const cy = sy + cellSize / 2;
          let e1x: number, e1y: number, e2x: number, e2y: number;
          const off = Math.floor(cellSize * 0.2);
          const fwd = Math.floor(cellSize * 0.15);

          if (dir === 'right') {
            e1x = cx + fwd; e1y = cy - off;
            e2x = cx + fwd; e2y = cy + off;
          } else if (dir === 'left') {
            e1x = cx - fwd; e1y = cy - off;
            e2x = cx - fwd; e2y = cy + off;
          } else if (dir === 'up') {
            e1x = cx - off; e1y = cy - fwd;
            e2x = cx + off; e2y = cy - fwd;
          } else {
            e1x = cx - off; e1y = cy + fwd;
            e2x = cx + off; e2y = cy + fwd;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.floor(e1x) - eyeSize, Math.floor(e1y) - eyeSize, eyeSize * 2, eyeSize * 2);
          ctx.fillRect(Math.floor(e2x) - eyeSize, Math.floor(e2y) - eyeSize, eyeSize * 2, eyeSize * 2);
          ctx.fillStyle = '#111111';
          ctx.fillRect(Math.floor(e1x), Math.floor(e1y), eyeSize, eyeSize);
          ctx.fillRect(Math.floor(e2x), Math.floor(e2y), eyeSize, eyeSize);
        }
      }
    }

    // ─── Bottom Hint Bar ───
    const bottomY = H - bottomBarH;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, bottomY, W, bottomBarH);
    ctx.strokeStyle = 'rgba(100,60,150,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, bottomY + 0.5);
    ctx.lineTo(W, bottomY + 0.5);
    ctx.stroke();

    const hintFontSize = Math.max(5, Math.floor(bottomBarH * 0.45));
    ctx.font = `${hintFontSize}px 'W95FA', monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const hintY = bottomY + bottomBarH / 2;
    const hints = ['\u2190\u2192 MOVE', '\u2191\u2193 MOVE'];
    const hintSpacing = W / (hints.length + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let i = 0; i < hints.length; i++) {
      ctx.fillText(hints[i], hintSpacing * (i + 1), hintY);
    }

    // ─── Overlays ───
    if (gameStateRef.current === 'ready') {
      ctx.fillStyle = 'rgba(18,9,29,0.88)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#ffcc00';
      ctx.font = `bold ${Math.floor(W * 0.1)}px 'W95FA', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,204,0,0.4)';
      ctx.shadowBlur = 12;
      ctx.fillText('SNAKE', W / 2, H * 0.38);
      ctx.shadowBlur = 0;

      // Decorative snake icon
      const iconY = H * 0.26;
      const iconSize = Math.max(4, Math.floor(W * 0.02));
      const iconSegs = [
        { x: -3, y: 0 }, { x: -2, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      ];
      for (let i = 0; i < iconSegs.length; i++) {
        const seg = iconSegs[i];
        ctx.fillStyle = i === iconSegs.length - 1 ? '#66dd88' : '#44bb66';
        ctx.fillRect(
          W / 2 + seg.x * (iconSize + 1) - iconSize / 2,
          iconY - iconSize / 2,
          iconSize,
          iconSize
        );
      }

      const blink = Math.floor(timestamp / 500) % 2 === 0;
      if (blink) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${Math.floor(W * 0.04)}px 'W95FA', monospace`;
        ctx.fillText('PRESS START OR TAP', W / 2, H * 0.52);
      }

      // Hi-score display
      if (hiScoreRef.current > 0) {
        ctx.fillStyle = 'rgba(255,204,68,0.4)';
        ctx.font = `${Math.floor(W * 0.035)}px 'W95FA', monospace`;
        ctx.fillText(`HI-SCORE: ${hiScoreRef.current}`, W / 2, H * 0.62);
      }
    }

    if (gameStateRef.current === 'over') {
      ctx.fillStyle = 'rgba(18,9,29,0.92)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#ff4466';
      ctx.font = `bold ${Math.floor(W * 0.08)}px 'W95FA', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,68,102,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText('GAME OVER', W / 2, H * 0.35);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `${Math.floor(W * 0.045)}px 'W95FA', monospace`;
      ctx.fillText(`SCORE: ${scoreRef.current}`, W / 2, H * 0.46);

      ctx.fillStyle = 'rgba(255,204,68,0.5)';
      ctx.font = `${Math.floor(W * 0.035)}px 'W95FA', monospace`;
      ctx.fillText(`SPEED LV: ${speedLevelRef.current}  LENGTH: ${snakeRef.current.length}`, W / 2, H * 0.52);

      if (scoreRef.current >= hiScoreRef.current && scoreRef.current > 0) {
        ctx.fillStyle = '#ffcc44';
        ctx.font = `bold ${Math.floor(W * 0.035)}px 'W95FA', monospace`;
        ctx.fillText('NEW HI-SCORE!', W / 2, H * 0.58);
      }

      const blink = Math.floor(timestamp / 600) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ffcc44';
        ctx.font = `${Math.floor(W * 0.038)}px 'W95FA', monospace`;
        ctx.fillText('PRESS START TO RETRY', W / 2, H * 0.66);
      }
    }
  }, []);

  // ── Game Loop ──────────────────────────────────────────
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (gameStateRef.current === 'playing') {
        const speed = Math.max(50, BASE_SPEED - (speedLevelRef.current - 1) * SPEED_INCREASE);
        if (timestamp - lastMoveRef.current > speed) {
          moveSnake();
          lastMoveRef.current = timestamp;
        }
      }

      draw(timestamp);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, moveSnake]);

  // ── Keyboard ───────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'ready') {
        if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === ' ') {
          e.preventDefault();
          resetGame();
        }
        if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
          e.preventDefault();
          onBack();
        }
        return;
      }
      if (gameStateRef.current === 'over') {
        if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === ' ') {
          e.preventDefault();
          resetGame();
        }
        if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
          e.preventDefault();
          onBack();
        }
        return;
      }
      if (gameStateRef.current !== 'playing') return;

      const dir = dirRef.current;
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault();
          if (dir !== 'right') nextDirRef.current = 'left';
          break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault();
          if (dir !== 'left') nextDirRef.current = 'right';
          break;
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault();
          if (dir !== 'down') nextDirRef.current = 'up';
          break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault();
          if (dir !== 'up') nextDirRef.current = 'down';
          break;
        case 'x': case 'X': case 'Escape':
          e.preventDefault();
          onBack();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [resetGame, onBack]);

  // ── Touch ──────────────────────────────────────────────
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameStateRef.current === 'ready' || gameStateRef.current === 'over') {
      resetGame();
      return;
    }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, [resetGame]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || gameStateRef.current !== 'playing') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const dir = dirRef.current;

    // Minimum swipe distance
    if (absDx < 15 && absDy < 15) {
      touchStart.current = null;
      return;
    }

    if (absDx > absDy) {
      // Horizontal swipe
      if (dx > 0 && dir !== 'left') nextDirRef.current = 'right';
      else if (dx < 0 && dir !== 'right') nextDirRef.current = 'left';
    } else {
      // Vertical swipe
      if (dy > 0 && dir !== 'up') nextDirRef.current = 'down';
      else if (dy < 0 && dir !== 'down') nextDirRef.current = 'up';
    }
    touchStart.current = null;
  }, []);

  // ── Render ─────────────────────────────────────────────
  return (
    <div
      className="gb-game-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="gb-game-body" ref={containerRef}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
      </div>
    </div>
  );
}

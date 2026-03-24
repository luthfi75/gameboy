'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChiptunePlayer } from '../lib/chiptune';

interface TetrisGameProps {
  onBack: () => void;
  chiptune?: ChiptunePlayer | null;
}

// ── Constants ──────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],                     // I
  [[1, 1], [1, 1]],                   // O
  [[0, 1, 0], [1, 1, 1]],            // T
  [[0, 0, 1], [1, 1, 1]],            // L
  [[1, 0, 0], [1, 1, 1]],            // J
  [[0, 1, 1], [1, 1, 0]],            // S
  [[1, 1, 0], [0, 1, 1]],            // Z
];

const PIECE_COLORS = [
  '#44bbcc', // I - cyan
  '#ddaa22', // O - yellow
  '#aa44cc', // T - purple
  '#cc6622', // L - orange
  '#3366cc', // J - blue
  '#44bb44', // S - green
  '#cc3355', // Z - red
];

// const PIECE_NAMES = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];

const LINE_SCORES = [0, 100, 300, 500, 800];

// ── Helpers ────────────────────────────────────────────────
type Grid = (number | null)[][]; // stores piece index (0-6) or null

function createGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotateShape(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = [];
  for (let c = 0; c < cols; c++) {
    result.push([]);
    for (let r = rows - 1; r >= 0; r--) {
      result[c].push(shape[r][c]);
    }
  }
  return result;
}

function collides(grid: Grid, shape: number[][], px: number, py: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = px + c;
      const ny = py + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx] !== null) return true;
    }
  }
  return false;
}

// Wall kick offsets to try when rotation collides
const WALL_KICKS = [
  [0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0],
  [0, -1], [-1, -1], [1, -1], [0, -2],
];

function getGhostY(grid: Grid, shape: number[][], px: number, py: number): number {
  let gy = py;
  while (!collides(grid, shape, px, gy + 1)) gy++;
  return gy;
}

function randomBag(): number[] {
  const bag = [0, 1, 2, 3, 4, 5, 6];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

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
export default function TetrisGame({ onBack, chiptune }: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastDropRef = useRef<number>(0);

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready');
  const [, setScore] = useState(0);
  const [, setLevel] = useState(1);
  const [, setLines] = useState(0);

  // Mutable game state via refs
  const gridRef = useRef<Grid>(createGrid());
  const pieceRef = useRef({ idx: 0, shape: SHAPES[0], x: 0, y: 0 });
  const bagRef = useRef<number[]>([]);
  const nextIdxRef = useRef(0);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const gameStateRef = useRef<'ready' | 'playing' | 'paused' | 'over'>('ready');

  // Line clear animation
  const clearingLinesRef = useRef<number[]>([]);
  const clearAnimFrameRef = useRef(0);

  // Sync state ref
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const nextFromBag = useCallback((): number => {
    if (bagRef.current.length === 0) bagRef.current = randomBag();
    return bagRef.current.pop()!;
  }, []);

  const spawnPiece = useCallback(() => {
    const idx = nextIdxRef.current;
    nextIdxRef.current = nextFromBag();
    const shape = SHAPES[idx];
    const px = Math.floor((COLS - shape[0].length) / 2);
    pieceRef.current = { idx, shape, x: px, y: -1 };
    if (collides(gridRef.current, shape, px, 0)) {
      setGameState('over');
      chiptune?.playGameOverSound();
    }
  }, [nextFromBag, chiptune]);

  const lockPiece = useCallback(() => {
    const { idx, shape, x, y } = pieceRef.current;
    const grid = gridRef.current;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] && y + r >= 0) {
          grid[y + r][x + c] = idx;
        }
      }
    }

    // Find full lines
    const fullLines: number[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(cell => cell !== null)) fullLines.push(r);
    }

    if (fullLines.length > 0) {
      clearingLinesRef.current = fullLines;
      clearAnimFrameRef.current = 0;
      // Points
      const points = LINE_SCORES[fullLines.length] || 800;
      scoreRef.current += points * levelRef.current;
      linesRef.current += fullLines.length;
      const newLevel = Math.floor(linesRef.current / 10) + 1;
      levelRef.current = newLevel;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(newLevel);
    }

    // Actually clear after a few frames (handled in draw loop)
    if (fullLines.length === 0) {
      spawnPiece();
    }
  }, [spawnPiece]);

  const clearFullLines = useCallback(() => {
    const grid = gridRef.current;
    const linesToClear = clearingLinesRef.current.sort((a, b) => b - a);
    for (const r of linesToClear) {
      grid.splice(r, 1);
      grid.unshift(Array(COLS).fill(null));
    }
    clearingLinesRef.current = [];
    spawnPiece();
  }, [spawnPiece]);

  const moveDown = useCallback(() => {
    const { shape, x, y } = pieceRef.current;
    if (!collides(gridRef.current, shape, x, y + 1)) {
      pieceRef.current.y++;
      return true;
    } else {
      lockPiece();
      return false;
    }
  }, [lockPiece]);

  const moveLeft = useCallback(() => {
    const { shape, x, y } = pieceRef.current;
    if (!collides(gridRef.current, shape, x - 1, y)) pieceRef.current.x--;
  }, []);

  const moveRight = useCallback(() => {
    const { shape, x, y } = pieceRef.current;
    if (!collides(gridRef.current, shape, x + 1, y)) pieceRef.current.x++;
  }, []);

  const rotatePiece = useCallback(() => {
    const { shape, x, y } = pieceRef.current;
    const rotated = rotateShape(shape);
    for (const [dx, dy] of WALL_KICKS) {
      if (!collides(gridRef.current, rotated, x + dx, y + dy)) {
        pieceRef.current.shape = rotated;
        pieceRef.current.x = x + dx;
        pieceRef.current.y = y + dy;
        return;
      }
    }
  }, []);

  const hardDrop = useCallback(() => {
    const { shape, x } = pieceRef.current;
    let dropped = 0;
    while (!collides(gridRef.current, shape, x, pieceRef.current.y + 1)) {
      pieceRef.current.y++;
      dropped++;
    }
    scoreRef.current += dropped * 2;
    setScore(scoreRef.current);
    lockPiece();
  }, [lockPiece]);

  const resetGame = useCallback(() => {
    gridRef.current = createGrid();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    clearingLinesRef.current = [];
    bagRef.current = randomBag();
    nextIdxRef.current = nextFromBag();
    setScore(0);
    setLines(0);
    setLevel(1);
    spawnPiece();
    setGameState('playing');
    chiptune?.playStartSound();
    lastDropRef.current = performance.now();
  }, [spawnPiece, nextFromBag, chiptune]);

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
    const cellSize = Math.floor(playAreaH / ROWS);
    const fieldH = cellSize * ROWS;
    const fieldW = cellSize * COLS;
    const sidebarW = Math.floor((W - fieldW) / 2);
    const fieldX = sidebarW;
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

    // LV (center badge)
    const lvText = `LV ${levelRef.current}`;
    const lvWidth = ctx.measureText(lvText).width + 8;
    const lvX = Math.floor(W / 2 - lvWidth / 2);
    ctx.fillStyle = 'rgba(100,60,150,0.3)';
    ctx.strokeStyle = 'rgba(140,90,200,0.5)';
    ctx.lineWidth = 1;
    const badgeH = hudFontSize + 4;
    const badgeY = hudY - badgeH / 2;
    ctx.beginPath();
    ctx.roundRect(lvX, badgeY, lvWidth, badgeH, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ddbbff';
    ctx.textAlign = 'center';
    ctx.fillText(lvText, W / 2, hudY);

    // LINES (right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b89830';
    ctx.fillText('LINES', W - 4 - ctx.measureText(String(linesRef.current)).width - 2, hudY);
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(String(linesRef.current), W - 4, hudY);

    // ─── Left Sidebar ───
    const sideX = 2;
    const sideW = sidebarW - 4;

    // NEXT piece preview
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `bold ${Math.max(6, Math.floor(cellSize * 0.55))}px 'W95FA', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('NEXT', sideX + sideW / 2, fieldY + 2);

    const nextBoxY = fieldY + Math.floor(cellSize * 0.8);
    const nextBoxSize = Math.min(sideW - 4, cellSize * 4);
    const nextBoxX = sideX + Math.floor((sideW - nextBoxSize) / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeStyle = 'rgba(100,60,150,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(nextBoxX, nextBoxY, nextBoxSize, nextBoxSize, 2);
    ctx.fill();
    ctx.stroke();

    // Draw next piece
    if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
      const nextShape = SHAPES[nextIdxRef.current];
      const nextColor = PIECE_COLORS[nextIdxRef.current];
      const previewCell = Math.floor(nextBoxSize / 5);
      const nw = nextShape[0].length * previewCell;
      const nh = nextShape.length * previewCell;
      const npx = nextBoxX + Math.floor((nextBoxSize - nw) / 2);
      const npy = nextBoxY + Math.floor((nextBoxSize - nh) / 2);
      for (let r = 0; r < nextShape.length; r++) {
        for (let c = 0; c < nextShape[r].length; c++) {
          if (nextShape[r][c]) {
            drawBlock(ctx, npx + c * previewCell, npy + r * previewCell, previewCell, nextColor);
          }
        }
      }
    }

    // SPD indicator
    const spdY = nextBoxY + nextBoxSize + Math.floor(cellSize * 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `bold ${Math.max(6, Math.floor(cellSize * 0.5))}px 'W95FA', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SPD', sideX + sideW / 2, spdY);

    const barY = spdY + Math.floor(cellSize * 0.7);
    const barW = Math.max(6, Math.floor(sideW * 0.35));
    const barH = Math.floor(fieldH * 0.25);
    const barX = sideX + Math.floor((sideW - barW) / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeStyle = 'rgba(100,60,150,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.fill();
    ctx.stroke();

    const speedFill = Math.min(1, (levelRef.current - 1) / 14);
    const fillH = Math.floor(barH * speedFill);
    if (fillH > 0) {
      const grad = ctx.createLinearGradient(barX, barY + barH - fillH, barX, barY + barH);
      grad.addColorStop(0, '#44bb44');
      grad.addColorStop(0.5, '#bbcc22');
      grad.addColorStop(1, '#cc3355');
      ctx.fillStyle = grad;
      ctx.fillRect(barX + 1, barY + barH - fillH, barW - 2, fillH);
    }

    // ─── Right Sidebar ───
    const rightX = fieldX + fieldW + 2;
    const rightW = W - rightX - 2;

    // TETRIS vertical text
    ctx.fillStyle = '#aa44cc';
    ctx.font = `bold ${Math.max(7, Math.floor(cellSize * 0.6))}px 'W95FA', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tetrisText = 'TETRIS';
    const charH = Math.floor(cellSize * 0.75);
    const tetrisStartY = fieldY + 2;
    for (let i = 0; i < tetrisText.length; i++) {
      ctx.fillStyle = PIECE_COLORS[i % PIECE_COLORS.length];
      ctx.fillText(tetrisText[i], rightX + rightW / 2, tetrisStartY + i * charH);
    }

    // Color legend
    const legendY = tetrisStartY + tetrisText.length * charH + Math.floor(cellSize * 0.5);
    const legendCellSize = Math.max(4, Math.floor(cellSize * 0.45));
    const legendSpacing = legendCellSize + 2;
    for (let i = 0; i < PIECE_COLORS.length; i++) {
      const ly = legendY + i * legendSpacing;
      const lx = rightX + Math.floor((rightW - legendCellSize) / 2);
      drawBlock(ctx, lx, ly, legendCellSize, PIECE_COLORS[i]);
    }

    // NEXT LV info
    const nextLvY = legendY + PIECE_COLORS.length * legendSpacing + Math.floor(cellSize * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `bold ${Math.max(5, Math.floor(cellSize * 0.4))}px 'W95FA', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('NEXT', rightX + rightW / 2, nextLvY);
    ctx.fillText('LV', rightX + rightW / 2, nextLvY + Math.floor(cellSize * 0.5));

    // Lines counter X/10
    const linesInLevel = linesRef.current % 10;
    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${Math.max(6, Math.floor(cellSize * 0.5))}px 'W95FA', monospace`;
    ctx.fillText(`${linesInLevel}/10`, rightX + rightW / 2, nextLvY + Math.floor(cellSize * 1.1));

    // ─── Play Field Border ───
    ctx.strokeStyle = 'rgba(100,60,150,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(fieldX - 0.5, fieldY - 0.5, fieldW + 1, fieldH + 1);

    // ─── Play Field Background ───
    ctx.fillStyle = '#0e0618';
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // Grid lines
    ctx.strokeStyle = 'rgba(100,60,150,0.15)';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(fieldX, fieldY + r * cellSize + 0.5);
      ctx.lineTo(fieldX + fieldW, fieldY + r * cellSize + 0.5);
      ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(fieldX + c * cellSize + 0.5, fieldY);
      ctx.lineTo(fieldX + c * cellSize + 0.5, fieldY + fieldH);
      ctx.stroke();
    }

    // Placed blocks
    const grid = gridRef.current;
    const clearing = clearingLinesRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== null) {
          // Flash clearing lines
          if (clearing.includes(r)) {
            const flash = Math.floor(clearAnimFrameRef.current / 3) % 2 === 0;
            if (flash) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(fieldX + c * cellSize, fieldY + r * cellSize, cellSize, cellSize);
            } else {
              drawBlock(ctx, fieldX + c * cellSize, fieldY + r * cellSize, cellSize, PIECE_COLORS[grid[r][c]!]);
            }
          } else {
            drawBlock(ctx, fieldX + c * cellSize, fieldY + r * cellSize, cellSize, PIECE_COLORS[grid[r][c]!]);
          }
        }
      }
    }

    // Current piece + ghost
    if (gameStateRef.current === 'playing' && clearing.length === 0) {
      const { idx, shape, x, y } = pieceRef.current;
      const color = PIECE_COLORS[idx];

      // Ghost piece
      const ghostY = getGhostY(grid, shape, x, y);
      if (ghostY > y) {
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] && ghostY + r >= 0) {
              const bx = fieldX + (x + c) * cellSize;
              const by = fieldY + (ghostY + r) * cellSize;
              ctx.strokeStyle = `${color}55`;
              ctx.lineWidth = 1;
              ctx.strokeRect(bx + 1.5, by + 1.5, cellSize - 3, cellSize - 3);
            }
          }
        }
      }

      // Active piece
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] && y + r >= 0) {
            drawBlock(ctx, fieldX + (x + c) * cellSize, fieldY + (y + r) * cellSize, cellSize, color);
          }
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
    const hints = ['\u2191 ROT', '\u2190\u2192 MOVE', '\u2193 DROP'];
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
      ctx.fillText('TETRIS', W / 2, H * 0.38);
      ctx.shadowBlur = 0;

      const blink = Math.floor(timestamp / 500) % 2 === 0;
      if (blink) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${Math.floor(W * 0.04)}px 'W95FA', monospace`;
        ctx.fillText('PRESS START OR TAP', W / 2, H * 0.52);
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
      ctx.fillText(`LEVEL: ${levelRef.current}  LINES: ${linesRef.current}`, W / 2, H * 0.52);

      const blink = Math.floor(timestamp / 600) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ffcc44';
        ctx.font = `${Math.floor(W * 0.038)}px 'W95FA', monospace`;
        ctx.fillText('PRESS START TO RETRY', W / 2, H * 0.62);
      }
    }
  }, []);

  // Draw a single tetris block with shading
  function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    // Main fill
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Darker outline (1px border)
    ctx.strokeStyle = darkenColor(color, 50);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    // Inner highlight (top-left)
    const hl = Math.max(1, Math.floor(size * 0.15));
    ctx.fillStyle = lightenColor(color, 45);
    ctx.fillRect(x + 1, y + 1, size - 2, hl); // top edge
    ctx.fillRect(x + 1, y + 1, hl, size - 2); // left edge

    // Inner shadow (bottom-right)
    ctx.fillStyle = darkenColor(color, 35);
    ctx.fillRect(x + 1, y + size - 1 - hl, size - 2, hl); // bottom edge
    ctx.fillRect(x + size - 1 - hl, y + 1, hl, size - 2); // right edge
  }

  // ── Game Loop ──────────────────────────────────────────
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (gameStateRef.current === 'playing') {
        // Handle line clear animation
        if (clearingLinesRef.current.length > 0) {
          clearAnimFrameRef.current++;
          if (clearAnimFrameRef.current > 12) {
            clearFullLines();
          }
        } else {
          // Normal drop
          const speed = Math.max(80, 500 - (levelRef.current - 1) * 40);
          if (timestamp - lastDropRef.current > speed) {
            moveDown();
            lastDropRef.current = timestamp;
          }
        }
      }

      draw(timestamp);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, moveDown, clearFullLines]);

  // ── Keyboard ───────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'ready') {
        if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === ' ') {
          e.preventDefault();
          resetGame();
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

      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault(); moveLeft(); break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault(); moveRight(); break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault();
          if (moveDown()) {
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
          lastDropRef.current = performance.now();
          break;
        case 'ArrowUp': case 'z': case 'Z':
          e.preventDefault(); rotatePiece(); break;
        case ' ':
          e.preventDefault(); hardDrop(); lastDropRef.current = performance.now(); break;
        case 'x': case 'X': case 'Escape':
          e.preventDefault(); onBack(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [resetGame, moveLeft, moveRight, moveDown, rotatePiece, hardDrop, onBack]);

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
    const dt = Date.now() - touchStart.current.t;

    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 200) {
      rotatePiece();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20) moveRight();
      if (dx < -20) moveLeft();
    } else {
      if (dy > 30) hardDrop();
    }
    touchStart.current = null;
  }, [rotatePiece, moveRight, moveLeft, hardDrop]);

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

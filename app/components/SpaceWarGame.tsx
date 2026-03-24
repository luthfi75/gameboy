'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpaceWarGameProps {
  onBack: () => void;
}

const W = 240;
const H = 260;
const HUD_H = 28;
const CTRL_H = 16;
const GAME_TOP = HUD_H + CTRL_H;
const GAME_H = H - GAME_TOP;

// ---------- Types ----------
interface Bullet { x: number; y: number; isEnemy: boolean; }
interface Enemy {
  x: number; y: number; w: number; h: number;
  speed: number; type: number; hp: number;
  animFrame: number; shootCooldown: number;
}
interface Star { x: number; y: number; speed: number; brightness: number; size: number; }
interface Particle {
  x: number; y: number; dx: number; dy: number;
  life: number; maxLife: number; color: string; size: number;
}
interface PowerUp { x: number; y: number; type: 'shield' | 'rapid' | 'multi'; life: number; }

// ---------- Pixel art sprite drawers ----------

function drawPlayerShip(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  // Main body (dark blue)
  ctx.fillStyle = '#1a3a6a';
  ctx.fillRect(px - 4, py + 2, 8, 6);
  // Body highlight (medium blue)
  ctx.fillStyle = '#2255aa';
  ctx.fillRect(px - 3, py + 3, 6, 4);
  // Upper body / nose
  ctx.fillStyle = '#3377cc';
  ctx.fillRect(px - 2, py - 1, 4, 4);
  ctx.fillRect(px - 1, py - 3, 2, 3);
  // Tip
  ctx.fillStyle = '#55aaee';
  ctx.fillRect(px, py - 4, 1, 2);
  // Cockpit (yellow/orange)
  ctx.fillStyle = '#ffaa22';
  ctx.fillRect(px - 1, py + 1, 2, 2);
  ctx.fillStyle = '#ffcc44';
  ctx.fillRect(px, py + 1, 1, 1);
  // Wings
  ctx.fillStyle = '#2255aa';
  ctx.fillRect(px - 6, py + 4, 3, 4);
  ctx.fillRect(px + 3, py + 4, 3, 4);
  // Wing tips
  ctx.fillStyle = '#1a3a6a';
  ctx.fillRect(px - 7, py + 5, 1, 3);
  ctx.fillRect(px + 6, py + 5, 1, 3);
  // Wing accents
  ctx.fillStyle = '#55aaee';
  ctx.fillRect(px - 5, py + 4, 1, 1);
  ctx.fillRect(px + 4, py + 4, 1, 1);
  // Engine glow (animated)
  const glowColors = ['#ff6600', '#ffaa00', '#ff4400', '#ffcc22'];
  const gi = frame % 4;
  ctx.fillStyle = glowColors[gi];
  ctx.fillRect(px - 2, py + 8, 1, 2 + (frame % 3));
  ctx.fillRect(px + 1, py + 8, 1, 2 + ((frame + 1) % 3));
  ctx.fillStyle = glowColors[(gi + 2) % 4];
  ctx.fillRect(px - 1, py + 8, 2, 1 + (frame % 2));
  // Engine base
  ctx.fillStyle = '#334466';
  ctx.fillRect(px - 2, py + 7, 4, 1);
}

function drawSmallInvader(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const f = frame % 2;
  // Body
  ctx.fillStyle = '#cc3355';
  ctx.fillRect(px - 3, py, 6, 5);
  // Head
  ctx.fillStyle = '#dd4466';
  ctx.fillRect(px - 2, py - 1, 4, 2);
  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px - 2, py, 1, 1);
  ctx.fillRect(px + 1, py, 1, 1);
  ctx.fillStyle = '#000000';
  ctx.fillRect(px - 2, py + 1, 1, 1);
  ctx.fillRect(px + 1, py + 1, 1, 1);
  // Antennas
  ctx.fillStyle = '#ee5577';
  if (f === 0) {
    ctx.fillRect(px - 3, py - 3, 1, 2);
    ctx.fillRect(px + 2, py - 3, 1, 2);
  } else {
    ctx.fillRect(px - 2, py - 3, 1, 2);
    ctx.fillRect(px + 1, py - 3, 1, 2);
  }
  // Antenna tips
  ctx.fillStyle = '#ff8899';
  if (f === 0) {
    ctx.fillRect(px - 3, py - 3, 1, 1);
    ctx.fillRect(px + 2, py - 3, 1, 1);
  } else {
    ctx.fillRect(px - 2, py - 3, 1, 1);
    ctx.fillRect(px + 1, py - 3, 1, 1);
  }
  // Legs (animated)
  ctx.fillStyle = '#cc3355';
  if (f === 0) {
    ctx.fillRect(px - 4, py + 4, 1, 2);
    ctx.fillRect(px + 3, py + 4, 1, 2);
    ctx.fillRect(px - 2, py + 5, 1, 1);
    ctx.fillRect(px + 1, py + 5, 1, 1);
  } else {
    ctx.fillRect(px - 3, py + 5, 1, 2);
    ctx.fillRect(px + 2, py + 5, 1, 2);
    ctx.fillRect(px - 1, py + 5, 1, 1);
    ctx.fillRect(px, py + 5, 1, 1);
  }
}

function drawBigInvader(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const f = frame % 2;
  // Main body
  ctx.fillStyle = '#cc6622';
  ctx.fillRect(px - 5, py, 10, 7);
  // Dome
  ctx.fillStyle = '#dd7733';
  ctx.fillRect(px - 4, py - 2, 8, 3);
  ctx.fillRect(px - 3, py - 3, 6, 2);
  // Crown
  ctx.fillStyle = '#ee8844';
  ctx.fillRect(px - 2, py - 4, 4, 1);
  // Eyes (menacing)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px - 3, py, 2, 2);
  ctx.fillRect(px + 1, py, 2, 2);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(px - 3, py + 1, 1, 1);
  ctx.fillRect(px + 2, py + 1, 1, 1);
  // Mouth
  ctx.fillStyle = '#000000';
  ctx.fillRect(px - 2, py + 3, 4, 1);
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(px - 1, py + 4, 2, 1);
  // Arms/claws
  ctx.fillStyle = '#cc6622';
  if (f === 0) {
    ctx.fillRect(px - 7, py + 1, 2, 4);
    ctx.fillRect(px + 5, py + 1, 2, 4);
    ctx.fillRect(px - 8, py + 4, 1, 2);
    ctx.fillRect(px + 7, py + 4, 1, 2);
  } else {
    ctx.fillRect(px - 7, py + 2, 2, 4);
    ctx.fillRect(px + 5, py + 2, 2, 4);
    ctx.fillRect(px - 8, py + 2, 1, 2);
    ctx.fillRect(px + 7, py + 2, 1, 2);
  }
  // Legs
  ctx.fillStyle = '#bb5511';
  if (f === 0) {
    ctx.fillRect(px - 4, py + 7, 2, 2);
    ctx.fillRect(px + 2, py + 7, 2, 2);
  } else {
    ctx.fillRect(px - 3, py + 7, 2, 2);
    ctx.fillRect(px + 1, py + 7, 2, 2);
  }
}

function drawExplosion(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    const progress = p.life / p.maxLife;
    const alpha = progress;
    const size = Math.max(1, Math.floor(p.size * progress));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), size, size);
  });
  ctx.globalAlpha = 1;
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp, frame: number) {
  const px = Math.floor(pu.x);
  const py = Math.floor(pu.y);
  const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  const colors: Record<string, string[]> = {
    shield: ['#2288ff', '#55aaff'],
    rapid: ['#22cc44', '#55ff66'],
    multi: ['#cc44ff', '#ee88ff'],
  };
  const [c1, c2] = colors[pu.type] || colors.shield;
  ctx.fillStyle = c1;
  ctx.fillRect(px - 3, py - 3, 6, 6);
  ctx.fillStyle = c2;
  ctx.fillRect(px - 2, py - 2, 4, 4);
  // Border sparkle
  ctx.fillStyle = '#ffffff';
  if (frame % 8 < 4) {
    ctx.fillRect(px - 3, py - 3, 1, 1);
    ctx.fillRect(px + 2, py + 2, 1, 1);
  } else {
    ctx.fillRect(px + 2, py - 3, 1, 1);
    ctx.fillRect(px - 3, py + 2, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---------- HUD Drawing ----------

function drawHUD(ctx: CanvasRenderingContext2D, wave: number, lives: number, score: number, multiplier: number) {
  // HUD background
  ctx.fillStyle = 'rgba(5, 8, 20, 0.85)';
  ctx.fillRect(0, 0, W, HUD_H);
  // Bottom border
  ctx.fillStyle = '#1a2a4a';
  ctx.fillRect(0, HUD_H - 1, W, 1);

  // Score (left)
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${score}`, 4, 12);
  if (multiplier > 1) {
    ctx.fillStyle = '#ff8844';
    ctx.font = '7px monospace';
    ctx.fillText(`x${multiplier}`, 4, 22);
  }

  // Wave badge (center)
  const waveText = `WAVE ${wave}`;
  ctx.font = 'bold 8px monospace';
  const tw = ctx.measureText(waveText).width;
  const bx = (W - tw) / 2 - 6;
  const bw = tw + 12;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(bx, 4, bw, 14);
  ctx.strokeStyle = '#886622';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, 4.5, bw - 1, 13);
  ctx.fillStyle = '#ffcc44';
  ctx.textAlign = 'center';
  ctx.fillText(waveText, W / 2, 14);

  // Hearts (right)
  for (let i = 0; i < 3; i++) {
    const hx = W - 12 - i * 14;
    const hy = 6;
    if (i < lives) {
      drawPixelHeart(ctx, hx, hy, '#ee2244', '#ff4466');
    } else {
      drawPixelHeart(ctx, hx, hy, '#2a1a1a', '#3a2222');
    }
  }

  // Controls bar
  ctx.fillStyle = 'rgba(5, 8, 20, 0.7)';
  ctx.fillRect(0, HUD_H, W, CTRL_H);
  ctx.fillStyle = '#1a2a4a';
  ctx.fillRect(0, HUD_H + CTRL_H - 1, W, 1);

  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  const pills = [
    { label: '\u2190\u2192 MOVE', x: 40 },
    { label: 'AUTO FIRE', x: W / 2 },
    { label: 'X QUIT', x: W - 40 },
  ];
  pills.forEach(pill => {
    const ptw = ctx.measureText(pill.label).width;
    const ppx = pill.x - ptw / 2 - 4;
    const ppw = ptw + 8;
    ctx.fillStyle = 'rgba(30, 40, 70, 0.8)';
    ctx.fillRect(ppx, HUD_H + 3, ppw, 10);
    ctx.strokeStyle = '#334466';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(ppx + 0.5, HUD_H + 3.5, ppw - 1, 9);
    ctx.fillStyle = '#6688aa';
    ctx.fillText(pill.label, pill.x, HUD_H + 11);
  });
}

function drawPixelHeart(ctx: CanvasRenderingContext2D, x: number, y: number, c1: string, c2: string) {
  ctx.fillStyle = c1;
  // Top bumps
  ctx.fillRect(x - 4, y + 1, 3, 3);
  ctx.fillRect(x + 1, y + 1, 3, 3);
  ctx.fillRect(x - 3, y, 2, 1);
  ctx.fillRect(x + 1, y, 2, 1);
  // Middle
  ctx.fillRect(x - 4, y + 3, 8, 2);
  // Lower
  ctx.fillRect(x - 3, y + 5, 6, 1);
  ctx.fillRect(x - 2, y + 6, 4, 1);
  ctx.fillRect(x - 1, y + 7, 2, 1);
  // Highlight
  ctx.fillStyle = c2;
  ctx.fillRect(x - 3, y + 1, 1, 2);
  ctx.fillRect(x + 1, y + 1, 1, 2);
}

// ---------- Main Component ----------

export default function SpaceWarGame({ onBack }: SpaceWarGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'waveAnnounce' | 'over'>('ready');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayWave, setDisplayWave] = useState(1);
  const [displayLives, setDisplayLives] = useState(3);

  // Game state refs
  const stateRef = useRef({
    score: 0,
    wave: 1,
    lives: 3,
    multiplier: 1,
    consecutiveKills: 0,
    frame: 0,
    lastShot: 0,
    enemiesKilledThisWave: 0,
    enemiesPerWave: 8,
    enemiesSpawned: 0,
    waveAnnounceTicks: 0,
    invincibleTicks: 0,
    rapidFireTicks: 0,
    multiShotTicks: 0,
    shieldActive: false,
    gamePhase: 'ready' as 'ready' | 'playing' | 'waveAnnounce' | 'over',
  });

  const playerRef = useRef({ x: W / 2, y: GAME_TOP + GAME_H - 24, w: 14, h: 12 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const keysRef = useRef(new Set<string>());
  const animRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // Init stars
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * W,
        y: GAME_TOP + Math.random() * GAME_H,
        speed: 0.1 + Math.random() * 0.6,
        brightness: 0.2 + Math.random() * 0.8,
        size: Math.random() > 0.85 ? 2 : 1,
      });
    }
    starsRef.current = stars;
  }, []);

  const spawnExplosion = useCallback((x: number, y: number, color: string, count: number = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 0.5 + Math.random() * 2.5;
      const maxLife = 20 + Math.random() * 15;
      particlesRef.current.push({
        x, y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        color,
        size: 1 + Math.floor(Math.random() * 3),
      });
    }
  }, []);

  const startWave = useCallback((waveNum: number) => {
    const s = stateRef.current;
    s.wave = waveNum;
    s.enemiesKilledThisWave = 0;
    s.enemiesSpawned = 0;
    s.enemiesPerWave = 6 + waveNum * 3;
    s.waveAnnounceTicks = 90;
    s.gamePhase = 'waveAnnounce';
    setGameState('waveAnnounce');
    setDisplayWave(waveNum);
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.wave = 1;
    s.lives = 3;
    s.multiplier = 1;
    s.consecutiveKills = 0;
    s.frame = 0;
    s.lastShot = 0;
    s.invincibleTicks = 0;
    s.rapidFireTicks = 0;
    s.multiShotTicks = 0;
    s.shieldActive = false;
    playerRef.current = { x: W / 2, y: GAME_TOP + GAME_H - 24, w: 14, h: 12 };
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    setDisplayScore(0);
    setDisplayLives(3);
    startWave(1);
  }, [startWave]);

  // ---------- Main draw & update ----------
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, W, H);

    // Stars
    starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > H) { star.y = GAME_TOP; star.x = Math.random() * W; }
      ctx.fillStyle = `rgba(255,255,255,${star.brightness})`;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    });

    const s = stateRef.current;

    // Draw game entities
    // Power-ups
    powerUpsRef.current.forEach(pu => drawPowerUp(ctx, pu, s.frame));

    // Enemy bullets (red dots)
    bulletsRef.current.filter(b => b.isEnemy).forEach(b => {
      ctx.fillStyle = '#ff3344';
      ctx.fillRect(Math.floor(b.x) - 1, Math.floor(b.y), 2, 3);
      ctx.fillStyle = '#ff8888';
      ctx.fillRect(Math.floor(b.x), Math.floor(b.y), 1, 2);
    });

    // Player bullets
    bulletsRef.current.filter(b => !b.isEnemy).forEach(b => {
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(Math.floor(b.x) - 1, Math.floor(b.y), 2, 5);
      ctx.fillStyle = '#ffee66';
      ctx.fillRect(Math.floor(b.x), Math.floor(b.y), 1, 3);
    });

    // Enemies
    const animFrame = Math.floor(s.frame / 20);
    enemiesRef.current.forEach(e => {
      if (e.type === 0) {
        drawSmallInvader(ctx, e.x, e.y, animFrame);
      } else {
        drawBigInvader(ctx, e.x, e.y, animFrame);
      }
    });

    // Player
    if (s.gamePhase === 'playing' || s.gamePhase === 'waveAnnounce') {
      const p = playerRef.current;
      if (s.invincibleTicks > 0 && s.frame % 4 < 2) {
        // blink when invincible
      } else {
        drawPlayerShip(ctx, p.x, p.y, s.frame);
      }
      // Shield visual
      if (s.shieldActive) {
        ctx.strokeStyle = `rgba(34, 136, 255, ${0.4 + Math.sin(s.frame * 0.2) * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 3, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Particles / explosions
    drawExplosion(ctx, particlesRef.current);

    // HUD (drawn on top)
    drawHUD(ctx, s.wave, s.lives, s.score, s.multiplier);

    // Wave announcement overlay
    if (s.gamePhase === 'waveAnnounce' && s.waveAnnounceTicks > 0) {
      const alpha = s.waveAnnounceTicks > 70 ? (90 - s.waveAnnounceTicks) / 20 :
                    s.waveAnnounceTicks < 20 ? s.waveAnnounceTicks / 20 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffcc44';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${s.wave}`, W / 2, GAME_TOP + GAME_H / 2 - 4);
      ctx.fillStyle = '#8899aa';
      ctx.font = '8px monospace';
      ctx.fillText('GET READY', W / 2, GAME_TOP + GAME_H / 2 + 12);
      ctx.globalAlpha = 1;
    }
  }, []);

  // ---------- Update logic ----------
  const updateGame = useCallback(() => {
    const s = stateRef.current;
    s.frame++;

    const player = playerRef.current;
    const keys = keysRef.current;

    // Decrement timers
    if (s.invincibleTicks > 0) s.invincibleTicks--;
    if (s.rapidFireTicks > 0) s.rapidFireTicks--;
    if (s.multiShotTicks > 0) s.multiShotTicks--;

    // Wave announcement countdown
    if (s.gamePhase === 'waveAnnounce') {
      s.waveAnnounceTicks--;
      if (s.waveAnnounceTicks <= 0) {
        s.gamePhase = 'playing';
        setGameState('playing');
      }
    }

    // Player movement
    const speed = 2.5;
    if (keys.has('ArrowLeft') || keys.has('a')) player.x = Math.max(8, player.x - speed);
    if (keys.has('ArrowRight') || keys.has('d')) player.x = Math.min(W - 8, player.x + speed);
    if (keys.has('ArrowUp') || keys.has('w')) player.y = Math.max(GAME_TOP + 10, player.y - speed);
    if (keys.has('ArrowDown') || keys.has('s')) player.y = Math.min(H - 14, player.y + speed);

    // Touch movement
    const touch = touchRef.current;
    if (touch) {
      const dx = touch.x - player.x;
      const dy = touch.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        const moveSpeed = Math.min(speed * 1.5, dist);
        player.x += (dx / dist) * moveSpeed;
        player.y += (dy / dist) * moveSpeed;
      }
      player.x = Math.max(8, Math.min(W - 8, player.x));
      player.y = Math.max(GAME_TOP + 10, Math.min(H - 14, player.y));
    }

    // Auto-fire
    if (s.gamePhase === 'playing') {
      const fireRate = s.rapidFireTicks > 0 ? 5 : 10;
      if (s.frame - s.lastShot >= fireRate) {
        bulletsRef.current.push({ x: player.x, y: player.y - 5, isEnemy: false });
        if (s.multiShotTicks > 0) {
          bulletsRef.current.push({ x: player.x - 4, y: player.y - 3, isEnemy: false });
          bulletsRef.current.push({ x: player.x + 4, y: player.y - 3, isEnemy: false });
        }
        s.lastShot = s.frame;
      }
    }

    // Move bullets
    bulletsRef.current.forEach(b => {
      if (b.isEnemy) b.y += 2;
      else b.y -= 4;
    });
    bulletsRef.current = bulletsRef.current.filter(b =>
      b.y > GAME_TOP - 5 && b.y < H + 5
    );

    // Spawn enemies
    if (s.gamePhase === 'playing' && s.enemiesSpawned < s.enemiesPerWave) {
      const spawnRate = Math.max(15, 40 - s.wave * 3);
      if (s.frame % spawnRate === 0) {
        const type = Math.random() > (0.75 - s.wave * 0.02) ? 1 : 0;
        enemiesRef.current.push({
          x: 15 + Math.random() * (W - 30),
          y: GAME_TOP - 10,
          w: type === 0 ? 10 : 16,
          h: type === 0 ? 8 : 10,
          speed: type === 0 ? 0.5 + Math.random() * 0.5 + s.wave * 0.08 : 0.3 + Math.random() * 0.3 + s.wave * 0.05,
          type,
          hp: type === 0 ? 1 : 2,
          animFrame: 0,
          shootCooldown: 60 + Math.floor(Math.random() * 120),
        });
        s.enemiesSpawned++;
      }
    }

    // Move enemies & shooting
    enemiesRef.current.forEach(e => {
      e.y += e.speed;
      e.animFrame++;
      e.shootCooldown--;
      // Enemy shoots back
      if (e.shootCooldown <= 0 && e.y > GAME_TOP + 10 && e.y < GAME_TOP + GAME_H * 0.7) {
        const shootChance = 0.3 + s.wave * 0.05;
        if (Math.random() < shootChance) {
          bulletsRef.current.push({ x: e.x, y: e.y + e.h, isEnemy: true });
        }
        e.shootCooldown = Math.max(30, 80 - s.wave * 5) + Math.floor(Math.random() * 60);
      }
    });
    enemiesRef.current = enemiesRef.current.filter(e => e.y < H + 15);

    // Power-up movement
    powerUpsRef.current.forEach(pu => { pu.y += 0.5; pu.life--; });
    powerUpsRef.current = powerUpsRef.current.filter(pu => pu.y < H + 10 && pu.life > 0);

    // Bullet-enemy collision
    if (s.gamePhase === 'playing') {
      const playerBullets = bulletsRef.current.filter(b => !b.isEnemy);
      const toRemoveBullets = new Set<number>();
      const toRemoveEnemies = new Set<number>();

      for (let bi = 0; bi < playerBullets.length; bi++) {
        const b = playerBullets[bi];
        const bIdx = bulletsRef.current.indexOf(b);
        for (let ei = 0; ei < enemiesRef.current.length; ei++) {
          if (toRemoveEnemies.has(ei)) continue;
          const e = enemiesRef.current[ei];
          if (b.x > e.x - e.w / 2 && b.x < e.x + e.w / 2 &&
              b.y > e.y - 2 && b.y < e.y + e.h + 2) {
            toRemoveBullets.add(bIdx);
            e.hp--;
            if (e.hp <= 0) {
              toRemoveEnemies.add(ei);
              const color = e.type === 0 ? '#cc3355' : '#cc6622';
              spawnExplosion(e.x, e.y + e.h / 2, color, e.type === 0 ? 10 : 16);
              s.consecutiveKills++;
              s.multiplier = Math.min(8, 1 + Math.floor(s.consecutiveKills / 5));
              const pts = (e.type === 0 ? 10 : 25) * s.multiplier;
              s.score += pts;
              s.enemiesKilledThisWave++;
              setDisplayScore(s.score);

              // Power-up drop chance
              if (Math.random() < 0.12) {
                const types: PowerUp['type'][] = ['shield', 'rapid', 'multi'];
                powerUpsRef.current.push({
                  x: e.x, y: e.y,
                  type: types[Math.floor(Math.random() * types.length)],
                  life: 300,
                });
              }
            } else {
              // Hit flash: small particles
              spawnExplosion(b.x, b.y, '#ffffff', 4);
            }
            break;
          }
        }
      }

      // Remove bullets and enemies
      bulletsRef.current = bulletsRef.current.filter((_, i) => !toRemoveBullets.has(i));
      enemiesRef.current = enemiesRef.current.filter((_, i) => !toRemoveEnemies.has(i));

      // Check wave complete
      if (s.enemiesKilledThisWave >= s.enemiesPerWave && enemiesRef.current.length === 0) {
        startWave(s.wave + 1);
      }

      // Player-enemy bullet collision
      if (s.invincibleTicks <= 0) {
        const enemyBullets = bulletsRef.current.filter(b => b.isEnemy);
        for (let i = 0; i < enemyBullets.length; i++) {
          const b = enemyBullets[i];
          if (b.x > player.x - 6 && b.x < player.x + 6 &&
              b.y > player.y - 4 && b.y < player.y + 10) {
            if (s.shieldActive) {
              s.shieldActive = false;
              spawnExplosion(player.x, player.y, '#2288ff', 8);
            } else {
              s.lives--;
              s.consecutiveKills = 0;
              s.multiplier = 1;
              s.invincibleTicks = 90;
              setDisplayLives(s.lives);
              spawnExplosion(player.x, player.y, '#3388cc', 15);
              if (s.lives <= 0) {
                s.gamePhase = 'over';
                setGameState('over');
                spawnExplosion(player.x, player.y, '#ff4400', 25);
              }
            }
            bulletsRef.current = bulletsRef.current.filter(bb => bb !== b);
            break;
          }
        }
      }

      // Player-enemy body collision
      if (s.invincibleTicks <= 0) {
        for (const e of enemiesRef.current) {
          if (player.x + 6 > e.x - e.w / 2 && player.x - 6 < e.x + e.w / 2 &&
              player.y + 10 > e.y && player.y - 4 < e.y + e.h) {
            if (s.shieldActive) {
              s.shieldActive = false;
              spawnExplosion(e.x, e.y, '#2288ff', 10);
            } else {
              s.lives--;
              s.consecutiveKills = 0;
              s.multiplier = 1;
              s.invincibleTicks = 90;
              setDisplayLives(s.lives);
              spawnExplosion(player.x, player.y, '#3388cc', 15);
              if (s.lives <= 0) {
                s.gamePhase = 'over';
                setGameState('over');
                spawnExplosion(player.x, player.y, '#ff4400', 25);
              }
            }
            break;
          }
        }
      }

      // Power-up collection
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        if (Math.abs(pu.x - player.x) < 8 && Math.abs(pu.y - player.y) < 8) {
          if (pu.type === 'shield') s.shieldActive = true;
          else if (pu.type === 'rapid') s.rapidFireTicks = 300;
          else if (pu.type === 'multi') s.multiShotTicks = 300;
          spawnExplosion(pu.x, pu.y, '#ffffff', 6);
          powerUpsRef.current.splice(i, 1);
        }
      }
    }

    // Update particles
    particlesRef.current.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.dx *= 0.96;
      p.dy *= 0.96;
      p.life--;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  }, [spawnExplosion, startWave]);

  // Game loop
  useEffect(() => {
    let rafId: number;

    const loop = () => {
      const phase = stateRef.current.gamePhase;
      if (phase === 'playing' || phase === 'waveAnnounce') {
        updateGame();
      }
      drawFrame();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [drawFrame, updateGame]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (stateRef.current.gamePhase === 'ready' && (e.key === 'Enter' || e.key === 'z' || e.key === ' ')) {
        resetGame();
      }
      if (stateRef.current.gamePhase === 'over' && (e.key === 'Enter' || e.key === 'z' || e.key === ' ')) {
        resetGame();
      }
      if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
        onBack();
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [resetGame, onBack]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (stateRef.current.gamePhase === 'ready' || stateRef.current.gamePhase === 'over') {
      resetGame();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - rect.left) / rect.width * W;
    const ty = (e.touches[0].clientY - rect.top) / rect.height * H;
    touchRef.current = { x: tx, y: ty };
  }, [resetGame]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - rect.left) / rect.width * W;
    const ty = (e.touches[0].clientY - rect.top) / rect.height * H;
    touchRef.current = { x: tx, y: ty };
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchRef.current = null;
  }, []);

  return (
    <div className="gb-game-screen">
      <div className="gb-game-body" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {gameState === 'ready' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5, 8, 20, 0.85)',
            zIndex: 10,
          }}>
            <div style={{
              color: '#ffcc44', fontFamily: 'monospace', fontWeight: 'bold',
              fontSize: '18px', letterSpacing: '3px', marginBottom: '4px',
              textShadow: '0 0 8px rgba(255,200,50,0.5)',
            }}>
              SPACE WAR
            </div>
            <div style={{
              color: '#cc3355', fontFamily: 'monospace', fontSize: '8px',
              marginBottom: '16px', letterSpacing: '1px',
            }}>
              PIXEL INVADERS
            </div>
            <div style={{
              border: '1px solid #886622', padding: '6px 16px',
              color: '#ffcc44', fontFamily: 'monospace', fontSize: '9px',
              background: 'rgba(20, 15, 5, 0.8)', letterSpacing: '1px',
            }}>
              PRESS START OR TAP
            </div>
            <div style={{
              color: '#556677', fontFamily: 'monospace', fontSize: '7px',
              marginTop: '12px',
            }}>
              ARROWS: MOVE &bull; X: QUIT
            </div>
          </div>
        )}
        {gameState === 'over' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10, 5, 5, 0.88)',
            zIndex: 10,
          }}>
            <div style={{
              color: '#ee2244', fontFamily: 'monospace', fontWeight: 'bold',
              fontSize: '16px', letterSpacing: '3px', marginBottom: '8px',
              textShadow: '0 0 10px rgba(255,30,60,0.6)',
            }}>
              GAME OVER
            </div>
            <div style={{
              color: '#ffcc44', fontFamily: 'monospace', fontSize: '10px',
              marginBottom: '4px',
            }}>
              SCORE: {displayScore}
            </div>
            <div style={{
              color: '#8899aa', fontFamily: 'monospace', fontSize: '8px',
              marginBottom: '4px',
            }}>
              WAVE {displayWave}
            </div>
            {stateRef.current.multiplier > 1 && (
              <div style={{
                color: '#ff8844', fontFamily: 'monospace', fontSize: '8px',
                marginBottom: '8px',
              }}>
                BEST MULTI: x{stateRef.current.multiplier}
              </div>
            )}
            <div
              onClick={resetGame}
              style={{
                border: '1px solid #886622', padding: '5px 14px',
                color: '#ffcc44', fontFamily: 'monospace', fontSize: '9px',
                background: 'rgba(20, 15, 5, 0.8)', cursor: 'pointer',
                letterSpacing: '1px', marginTop: '4px',
              }}
            >
              PLAY AGAIN
            </div>
            <div
              onClick={onBack}
              style={{
                color: '#556677', fontFamily: 'monospace', fontSize: '7px',
                marginTop: '10px', cursor: 'pointer',
              }}
            >
              BACK TO MENU
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

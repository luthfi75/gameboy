'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GameMenuProps {
  onSelectGame: (game: string) => void;
}

const games = [
  { id: 'tetris', name: 'TETRIS', desc: 'Stack the blocks!', color: '#cc3355' },
  { id: 'snake', name: 'SNAKE', desc: 'Eat & grow!', color: '#44bb66' },
  { id: 'spacewar', name: 'SPACE WAR', desc: 'Shoot em up!', color: '#3388cc' },
];

function drawTetrisIcon(ctx: CanvasRenderingContext2D) {
  const p = 3; // pixel size
  ctx.fillStyle = '#cc3355';
  // T-shaped tetromino
  ctx.fillRect(0 * p, 0 * p, p, p);
  ctx.fillRect(1 * p, 0 * p, p, p);
  ctx.fillRect(2 * p, 0 * p, p, p);
  ctx.fillRect(1 * p, 1 * p, p, p);
  // subtle highlight
  ctx.fillStyle = '#ee5577';
  ctx.fillRect(0 * p, 0 * p, p, 1);
  ctx.fillRect(1 * p, 0 * p, p, 1);
  ctx.fillRect(2 * p, 0 * p, p, 1);
}

function drawSnakeIcon(ctx: CanvasRenderingContext2D) {
  const p = 3;
  ctx.fillStyle = '#44bb66';
  // body: 4 connected segments in an L shape
  ctx.fillRect(0 * p, 1 * p, p, p);
  ctx.fillRect(1 * p, 1 * p, p, p);
  ctx.fillRect(2 * p, 1 * p, p, p);
  ctx.fillRect(2 * p, 0 * p, p, p);
  // head (brighter)
  ctx.fillStyle = '#66dd88';
  ctx.fillRect(2 * p, 0 * p, p, p);
  // eye
  ctx.fillStyle = '#1a0a28';
  ctx.fillRect(2 * p + 2, 0 * p + 1, 1, 1);
}

function drawSpaceWarIcon(ctx: CanvasRenderingContext2D) {
  const p = 2; // smaller pixel for more detail
  ctx.fillStyle = '#3388cc';
  // rocket body (center column)
  ctx.fillRect(3 * p, 0 * p, p, p); // nose
  ctx.fillRect(2 * p, 1 * p, 3 * p, p);
  ctx.fillRect(2 * p, 2 * p, 3 * p, p);
  ctx.fillRect(2 * p, 3 * p, 3 * p, p);
  // wings
  ctx.fillRect(1 * p, 3 * p, p, p);
  ctx.fillRect(5 * p, 3 * p, p, p);
  ctx.fillRect(0 * p, 4 * p, p, p);
  ctx.fillRect(6 * p, 4 * p, p, p);
  // exhaust
  ctx.fillStyle = '#55aadd';
  ctx.fillRect(3 * p, 4 * p, p, p);
  ctx.fillStyle = '#77ccee';
  ctx.fillRect(2 * p, 5 * p, p, p);
  ctx.fillRect(4 * p, 5 * p, p, p);
}

const iconDrawers = [drawTetrisIcon, drawSnakeIcon, drawSpaceWarIcon];

export default function GameMenu({ onSelectGame }: GameMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  const iconRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Draw pixel art icons
  useEffect(() => {
    iconRefs.current.forEach((canvas, i) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      iconDrawers[i](ctx);
    });
  }, []);

  // Animated starfield
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const stars: { x: number; y: number; speed: number; size: number; brightness: number }[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 0.15 + Math.random() * 0.5,
        size: Math.random() > 0.85 ? 2 : 1,
        brightness: 0.15 + Math.random() * 0.55,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(star => {
        star.y += star.speed;
        if (star.y > H) {
          star.y = 0;
          star.x = Math.random() * W;
          star.brightness = 0.15 + Math.random() * 0.55;
        }
        ctx.fillStyle = `rgba(255,255,255,${star.brightness})`;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard navigation
  const handleKey = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + games.length) % games.length);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % games.length);
        break;
      case 'Enter':
      case 'z':
      case 'Z':
        e.preventDefault();
        setSelectedIndex(curr => {
          onSelectGame(games[curr].id);
          return curr;
        });
        break;
    }
  }, [onSelectGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#12091d',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'W95FA', monospace",
    }}>
      {/* Starfield canvas */}
      <canvas
        ref={starCanvasRef}
        width={400}
        height={600}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '0 14px',
        overflow: 'hidden',
      }}>
        {/* Title section */}
        <div style={{ textAlign: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 'bold',
            color: '#ffcc00',
            letterSpacing: 5,
            textShadow: '0 0 12px rgba(255,204,0,0.35), 0 0 30px rgba(255,204,0,0.12)',
          }}>
            CYBERSPACE
          </div>

          {/* Decorative line with dots */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginTop: 3,
            marginBottom: 4,
          }}>
            <span style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#ffcc00',
              opacity: 0.6,
              display: 'inline-block',
            }} />
            <span style={{
              width: 80,
              height: 1,
              background: 'linear-gradient(90deg, transparent, #ffcc00 20%, #ffcc00 80%, transparent)',
              opacity: 0.4,
              display: 'inline-block',
              margin: '0 4px',
            }} />
            <span style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#ffcc00',
              opacity: 0.6,
              display: 'inline-block',
            }} />
          </div>

          {/* Control hints */}
          <div style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
          }}>
            {[
              { key: '\u2195', label: 'SELECT' },
              { key: 'A', label: 'PLAY' },
              { key: 'B', label: 'BACK' },
            ].map(hint => (
              <span key={hint.label} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 7,
                color: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '2px 7px',
              }}>
                <span style={{ color: '#ffcc00', fontSize: 8 }}>{hint.key}</span>
                {hint.label}
              </span>
            ))}
          </div>
        </div>

        {/* Game list - compact, no scroll */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          paddingTop: 4,
          paddingBottom: 2,
          justifyContent: 'center',
        }}>
          {games.map((game, i) => {
            const isSelected = i === selectedIndex;
            return (
              <button
                key={game.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 3,
                  border: `1px solid ${isSelected ? game.color : 'rgba(255,255,255,0.04)'}`,
                  cursor: 'pointer',
                  background: isSelected
                    ? `linear-gradient(135deg, rgba(${hexToRgb(game.color)}, 0.15) 0%, rgba(${hexToRgb(game.color)}, 0.06) 100%)`
                    : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                  fontFamily: "'W95FA', monospace",
                  textAlign: 'left',
                  width: '100%',
                  color: '#fff',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected
                    ? `0 0 20px rgba(${hexToRgb(game.color)}, 0.3), 0 0 40px rgba(${hexToRgb(game.color)}, 0.1), inset 0 0 24px rgba(${hexToRgb(game.color)}, 0.1)`
                    : '0 1px 4px rgba(0,0,0,0.2)',
                  outline: 'none',
                  flexShrink: 0,
                  backgroundImage: isSelected
                    ? `linear-gradient(135deg, rgba(${hexToRgb(game.color)}, 0.15) 0%, rgba(${hexToRgb(game.color)}, 0.06) 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(${hexToRgb(game.color)}, 0.03) 3px, rgba(${hexToRgb(game.color)}, 0.03) 4px)`
                    : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)',
                }}
              >
                {/* Pixel art icon */}
                <div style={{
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <canvas
                    ref={el => { iconRefs.current[i] = el; }}
                    width={i === 2 ? 14 : 9}
                    height={i === 2 ? 12 : 6}
                    style={{
                      imageRendering: 'pixelated',
                      width: i === 2 ? 20 : 14,
                      height: i === 2 ? 18 : 10,
                    }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 8,
                    fontWeight: 'bold',
                    letterSpacing: 1,
                    color: isSelected ? game.color : '#fff',
                    transition: 'color 0.18s',
                    textShadow: isSelected ? `0 0 8px rgba(${hexToRgb(game.color)}, 0.5)` : 'none',
                  }}>
                    {game.name}
                  </div>
                  <div style={{
                    fontSize: 6,
                    color: 'rgba(255,255,255,0.25)',
                    marginTop: 1,
                  }}>
                    {game.desc}
                  </div>
                </div>

                {/* Arrow */}
                <span style={{
                  fontSize: 7,
                  color: isSelected ? game.color : 'transparent',
                  transition: 'color 0.18s',
                  flexShrink: 0,
                  textShadow: isSelected ? `0 0 6px rgba(${hexToRgb(game.color)}, 0.6)` : 'none',
                }}>
                  &#9654;
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingBottom: 10,
          paddingTop: 4,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>
            On PC?{' '}
            <a
              href="https://disket.luthfigifari.web.id"
              style={{
                color: '#ffcc00',
                textDecoration: 'none',
                fontFamily: "'W95FA', monospace",
              }}
            >
              Open Desktop Mode
            </a>
          </div>
          <div style={{
            fontSize: 6,
            color: 'rgba(255,255,255,0.08)',
            marginTop: 3,
            letterSpacing: 2,
          }}>
            V1.0
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

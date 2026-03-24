'use client';

import { useState, useEffect, useCallback } from 'react';
import GameMenu from './components/GameMenu';
import TetrisGame from './components/TetrisGame';
import SnakeGame from './components/SnakeGame';
import SpaceWarGame from './components/SpaceWarGame';

type Screen = 'menu' | 'tetris' | 'snake' | 'spacewar';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleRequestBack = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const confirmExit = useCallback(() => {
    setShowExitDialog(false);
    setScreen('menu');
  }, []);

  const cancelExit = useCallback(() => {
    setShowExitDialog(false);
  }, []);

  useEffect(() => {
    if (!showExitDialog) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault(); e.stopPropagation(); confirmExit();
      } else if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
        e.preventDefault(); e.stopPropagation(); cancelExit();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [showExitDialog, confirmExit, cancelExit]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {screen === 'menu' && (
        <GameMenu onSelectGame={(game) => setScreen(game as Screen)} />
      )}
      {screen === 'tetris' && <TetrisGame onBack={handleRequestBack} />}
      {screen === 'snake' && <SnakeGame onBack={handleRequestBack} />}
      {screen === 'spacewar' && <SpaceWarGame onBack={handleRequestBack} />}

      {/* Quit dialog — INSIDE the screen */}
      {showExitDialog && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'rgba(6,2,14,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          fontFamily: "'W95FA', monospace",
        }}>
          <div style={{
            background: '#12091d',
            border: '2px solid #d4a820',
            borderRadius: 4,
            padding: '18px 22px 14px',
            textAlign: 'center',
            width: '80%',
            maxWidth: 200,
            position: 'relative',
            boxShadow: '0 0 30px rgba(212,168,32,0.12), inset 0 0 30px rgba(0,0,0,0.3)',
          }}>
            {/* Warning icon circle */}
            <div style={{
              position: 'absolute',
              top: -16,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#12091d',
              border: '2px solid #d4a820',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16, color: '#d4a820' }}>&#9888;</span>
            </div>

            {/* Title */}
            <div style={{
              fontSize: 13,
              fontWeight: 'bold',
              color: '#fff',
              letterSpacing: 2,
              marginTop: 10,
              marginBottom: 6,
            }}>
              QUIT GAME?
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: 7,
              color: 'rgba(255,255,255,0.35)',
              lineHeight: 1.5,
              marginBottom: 14,
            }}>
              Are you sure you want<br />to return to menu?
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {/* YES */}
              <div
                style={{
                  fontFamily: "'W95FA', monospace",
                  fontSize: 9,
                  fontWeight: 'bold',
                  letterSpacing: 1,
                  color: '#fff',
                  background: 'transparent',
                  border: '1px solid #44bb66',
                  borderRadius: 3,
                  padding: '5px 12px',
                  cursor: 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: '#44bb66',
                  color: '#fff',
                  fontSize: 7,
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>A</span>
                YES
              </div>

              {/* Separator */}
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />

              {/* NO */}
              <div
                style={{
                  fontFamily: "'W95FA', monospace",
                  fontSize: 9,
                  fontWeight: 'bold',
                  letterSpacing: 1,
                  color: '#fff',
                  background: 'transparent',
                  border: '1px solid #cc3355',
                  borderRadius: 3,
                  padding: '5px 12px',
                  cursor: 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: '#cc3355',
                  color: '#fff',
                  fontSize: 7,
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>B</span>
                NO
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

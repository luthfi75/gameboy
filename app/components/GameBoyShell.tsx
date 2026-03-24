'use client';

import { useCallback } from 'react';

function dispatchKey(key: string, type: 'keydown' | 'keyup' = 'keydown') {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

export default function GameBoyShell({ children }: { children: React.ReactNode }) {
  const dpad = useCallback((key: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); dispatchKey(key, 'keydown'); },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); dispatchKey(key, 'keyup'); },
    onPointerLeave: (e: React.PointerEvent) => { e.preventDefault(); dispatchKey(key, 'keyup'); },
  }), []);

  const btn = useCallback((key: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); dispatchKey(key, 'keydown'); },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); dispatchKey(key, 'keyup'); },
  }), []);

  return (
    <>
      <div className="retro-wallpaper" />

      <div className="gba-page">
        {/* Classic Game Boy body — one piece, leaf shape */}
        <div className="gb-body">
          {/* Screen bezel */}
          <div className="gb-screen-bezel">
            <div className="gb-power-row">
              <div className="gb-power-dot" />
              <span className="gb-power-label">POWER</span>
            </div>
            <div className="gb-screen">
              {children}
            </div>
            <span className="gb-screen-label">DOT MATRIX WITH STEREO SOUND</span>
          </div>

          {/* Controls */}
          <div className="gb-controls">
            {/* D-Pad with interactive zones */}
            <div className="gb-dpad">
              <div className="gb-dpad-bg" />
              <div className="gb-dpad-h" />
              <div className="gb-dpad-v" />
              <div className="gb-dpad-center" />
              <button className="gb-dpad-zone up" aria-label="Up" {...dpad('ArrowUp')} />
              <button className="gb-dpad-zone down" aria-label="Down" {...dpad('ArrowDown')} />
              <button className="gb-dpad-zone left" aria-label="Left" {...dpad('ArrowLeft')} />
              <button className="gb-dpad-zone right" aria-label="Right" {...dpad('ArrowRight')} />
            </div>

            {/* A/B Buttons */}
            <div className="gb-ab">
              <div className="gb-ab-bg" />
              <div className="gb-ab-col b-col">
                <button className="gb-btn-b" {...btn('x')}>B</button>
              </div>
              <div className="gb-ab-col a-col">
                <button className="gb-btn-a" {...btn('z')}>A</button>
              </div>
            </div>
          </div>

          {/* Start/Select */}
          <div className="gb-sys">
            <div className="gb-sys-col">
              <button className="gb-sys-btn" aria-label="Select" {...btn('Shift')} />
              <span className="gb-sys-label">SELECT</span>
            </div>
            <div className="gb-sys-col">
              <button className="gb-sys-btn" aria-label="Start" {...btn('Enter')} />
              <span className="gb-sys-label">START</span>
            </div>
          </div>

          {/* Speaker grille — wave/iron shape */}
          <div className="gb-speaker">
            <div className="gb-speaker-line" style={{ width: 8 }} />
            <div className="gb-speaker-line" style={{ width: 16 }} />
            <div className="gb-speaker-line" style={{ width: 24 }} />
            <div className="gb-speaker-line" style={{ width: 30 }} />
            <div className="gb-speaker-line" style={{ width: 24 }} />
            <div className="gb-speaker-line" style={{ width: 16 }} />
            <div className="gb-speaker-line" style={{ width: 8 }} />
          </div>
        </div>

        {/* Keyboard guide */}
        <div className="gb-guide">
          <div className="gb-guide-row">
            <kbd className="gb-key">&#9650;</kbd>
            <kbd className="gb-key">&#9660;</kbd>
            <kbd className="gb-key">&#9664;</kbd>
            <kbd className="gb-key">&#9654;</kbd>
            <span className="gb-key-label">D-PAD</span>
            <span className="gb-key-sep" />
            <kbd className="gb-key red">Z</kbd>
            <span className="gb-key-label">A</span>
            <span className="gb-key-sep" />
            <kbd className="gb-key purple">X</kbd>
            <span className="gb-key-label">B</span>
          </div>
          <div className="gb-guide-row">
            <kbd className="gb-key wide">ENTER</kbd>
            <span className="gb-key-label">START</span>
            <span className="gb-key-sep" />
            <kbd className="gb-key wide">SHIFT</kbd>
            <span className="gb-key-label">SELECT</span>
          </div>
        </div>

        <div className="gb-footer">MADE BY LUTHFI</div>
      </div>
    </>
  );
}

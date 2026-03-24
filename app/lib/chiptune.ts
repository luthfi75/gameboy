// ── Chiptune Music Engine ───────────────────────────────────
// Generates retro chiptune music using the Web Audio API.
// No external files needed — works offline with authentic retro feel.

type NoteEntry = { note: string; duration: number };

// Note-to-frequency mapping (A4 = 440 Hz, equal temperament)
const NOTE_FREQ: Record<string, number> = {
  '_': 0, // rest
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'Db4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'Gb4': 369.99, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'Db5': 554.37, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46,
  'Gb5': 739.99, 'G5': 783.99, 'Ab5': 830.61, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
  'C6': 1046.50,
  // Bass notes
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
};

// ── Melody Definitions ─────────────────────────────────────

// Menu: mellow, dreamy ambient loop
const MENU_MELODY: NoteEntry[] = [
  { note: 'E4', duration: 0.4 }, { note: 'G4', duration: 0.4 }, { note: 'B4', duration: 0.6 }, { note: '_', duration: 0.2 },
  { note: 'A4', duration: 0.4 }, { note: 'G4', duration: 0.4 }, { note: 'E4', duration: 0.6 }, { note: '_', duration: 0.2 },
  { note: 'D4', duration: 0.4 }, { note: 'E4', duration: 0.4 }, { note: 'G4', duration: 0.6 }, { note: '_', duration: 0.2 },
  { note: 'A4', duration: 0.4 }, { note: 'B4', duration: 0.4 }, { note: 'A4', duration: 0.6 }, { note: '_', duration: 0.2 },
];
const MENU_BASS: NoteEntry[] = [
  { note: 'E2', duration: 0.8 }, { note: '_', duration: 0.4 }, { note: 'E2', duration: 0.4 },
  { note: 'A2', duration: 0.8 }, { note: '_', duration: 0.4 }, { note: 'A2', duration: 0.4 },
  { note: 'G2', duration: 0.8 }, { note: '_', duration: 0.4 }, { note: 'G2', duration: 0.4 },
  { note: 'A2', duration: 0.8 }, { note: '_', duration: 0.4 }, { note: 'A2', duration: 0.4 },
];

// Tetris: Korobeiniki-inspired melody
const TETRIS_MELODY: NoteEntry[] = [
  { note: 'E5', duration: 0.25 }, { note: 'B4', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.125 }, { note: 'B4', duration: 0.125 },
  { note: 'A4', duration: 0.25 }, { note: 'A4', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'B4', duration: 0.375 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'C5', duration: 0.25 }, { note: 'A4', duration: 0.25 },
  { note: 'A4', duration: 0.375 }, { note: '_', duration: 0.125 },
  // Second phrase
  { note: 'D5', duration: 0.375 }, { note: 'F5', duration: 0.125 },
  { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.125 }, { note: 'F5', duration: 0.125 },
  { note: 'E5', duration: 0.375 }, { note: 'C5', duration: 0.125 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'B4', duration: 0.25 }, { note: 'B4', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'C5', duration: 0.25 }, { note: 'A4', duration: 0.25 },
  { note: 'A4', duration: 0.375 }, { note: '_', duration: 0.125 },
];
const TETRIS_BASS: NoteEntry[] = [
  { note: 'E3', duration: 0.5 }, { note: 'E3', duration: 0.5 },
  { note: 'A2', duration: 0.5 }, { note: 'A2', duration: 0.5 },
  { note: 'E3', duration: 0.5 }, { note: 'E3', duration: 0.5 },
  { note: 'A2', duration: 0.5 }, { note: 'A2', duration: 0.5 },
  { note: 'D3', duration: 0.5 }, { note: 'D3', duration: 0.5 },
  { note: 'A2', duration: 0.5 }, { note: 'A2', duration: 0.5 },
  { note: 'E3', duration: 0.5 }, { note: 'E3', duration: 0.5 },
  { note: 'A2', duration: 0.5 }, { note: 'A2', duration: 0.5 },
];

// Snake: simple, rhythmic, slightly tense
const SNAKE_MELODY: NoteEntry[] = [
  { note: 'E4', duration: 0.2 }, { note: '_', duration: 0.1 }, { note: 'E4', duration: 0.2 }, { note: '_', duration: 0.1 },
  { note: 'G4', duration: 0.2 }, { note: '_', duration: 0.1 }, { note: 'A4', duration: 0.2 }, { note: '_', duration: 0.1 },
  { note: 'B4', duration: 0.2 }, { note: '_', duration: 0.1 }, { note: 'A4', duration: 0.2 }, { note: '_', duration: 0.1 },
  { note: 'G4', duration: 0.2 }, { note: '_', duration: 0.1 }, { note: 'E4', duration: 0.2 }, { note: '_', duration: 0.1 },
  { note: 'D4', duration: 0.2 }, { note: '_', duration: 0.1 }, { note: 'D4', duration: 0.2 }, { note: '_', duration: 0.1 },
  { note: 'E4', duration: 0.2 }, { note: '_', duration: 0.1 }, { note: 'G4', duration: 0.2 }, { note: '_', duration: 0.1 },
  { note: 'E4', duration: 0.4 }, { note: '_', duration: 0.2 },
  { note: 'D4', duration: 0.4 }, { note: '_', duration: 0.2 },
];
const SNAKE_BASS: NoteEntry[] = [
  { note: 'E2', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'E2', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'G2', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'A2', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'D2', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'E2', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'E2', duration: 0.8 },
  { note: 'D2', duration: 0.8 },
];

// Space War: fast-paced, intense
const SPACEWAR_MELODY: NoteEntry[] = [
  { note: 'C5', duration: 0.15 }, { note: 'E5', duration: 0.15 }, { note: 'G5', duration: 0.15 }, { note: '_', duration: 0.05 },
  { note: 'G5', duration: 0.1 }, { note: 'F5', duration: 0.1 }, { note: 'E5', duration: 0.2 },
  { note: 'C5', duration: 0.15 }, { note: 'D5', duration: 0.15 }, { note: 'E5', duration: 0.15 }, { note: '_', duration: 0.05 },
  { note: 'E5', duration: 0.1 }, { note: 'D5', duration: 0.1 }, { note: 'C5', duration: 0.2 },
  { note: 'A4', duration: 0.15 }, { note: 'C5', duration: 0.15 }, { note: 'E5', duration: 0.15 }, { note: '_', duration: 0.05 },
  { note: 'E5', duration: 0.15 }, { note: 'F5', duration: 0.15 }, { note: 'G5', duration: 0.3 },
  { note: 'G5', duration: 0.1 }, { note: 'F5', duration: 0.1 }, { note: 'E5', duration: 0.1 }, { note: 'D5', duration: 0.1 },
  { note: 'C5', duration: 0.3 }, { note: '_', duration: 0.1 },
];
const SPACEWAR_BASS: NoteEntry[] = [
  { note: 'C3', duration: 0.3 }, { note: '_', duration: 0.2 }, { note: 'C3', duration: 0.3 }, { note: '_', duration: 0.2 },
  { note: 'A2', duration: 0.3 }, { note: '_', duration: 0.2 }, { note: 'A2', duration: 0.3 }, { note: '_', duration: 0.2 },
  { note: 'F2', duration: 0.3 }, { note: '_', duration: 0.2 }, { note: 'G2', duration: 0.3 }, { note: '_', duration: 0.2 },
  { note: 'C3', duration: 0.5 }, { note: '_', duration: 0.5 },
];

// Pacman: classic waka-waka inspired
const PACMAN_MELODY: NoteEntry[] = [
  { note: 'C5', duration: 0.15 }, { note: 'E5', duration: 0.15 }, { note: 'G5', duration: 0.15 }, { note: 'E5', duration: 0.15 },
  { note: 'C5', duration: 0.15 }, { note: '_', duration: 0.05 },
  { note: 'Db5', duration: 0.15 }, { note: 'F5', duration: 0.15 }, { note: 'Ab5', duration: 0.15 }, { note: 'F5', duration: 0.15 },
  { note: 'Db5', duration: 0.15 }, { note: '_', duration: 0.05 },
  { note: 'C5', duration: 0.15 }, { note: 'E5', duration: 0.15 }, { note: 'G5', duration: 0.15 }, { note: 'E5', duration: 0.15 },
  { note: 'G5', duration: 0.15 }, { note: 'A5', duration: 0.15 }, { note: 'B5', duration: 0.3 }, { note: '_', duration: 0.1 },
  { note: 'A5', duration: 0.15 }, { note: 'G5', duration: 0.15 }, { note: 'E5', duration: 0.15 }, { note: 'C5', duration: 0.15 },
  { note: 'D5', duration: 0.3 }, { note: '_', duration: 0.1 },
];
const PACMAN_BASS: NoteEntry[] = [
  { note: 'C3', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'Db4', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'C3', duration: 0.4 }, { note: '_', duration: 0.4 },
  { note: 'G2', duration: 0.4 }, { note: '_', duration: 0.4 },
];

// Minesweeper: suspenseful, careful
const MINESWEEPER_MELODY: NoteEntry[] = [
  { note: 'E4', duration: 0.5 }, { note: '_', duration: 0.25 },
  { note: 'G4', duration: 0.25 }, { note: 'A4', duration: 0.5 }, { note: '_', duration: 0.25 },
  { note: 'B4', duration: 0.25 }, { note: 'C5', duration: 0.5 }, { note: '_', duration: 0.25 },
  { note: 'B4', duration: 0.25 }, { note: 'A4', duration: 0.75 }, { note: '_', duration: 0.25 },
  { note: 'G4', duration: 0.5 }, { note: '_', duration: 0.25 },
  { note: 'E4', duration: 0.25 }, { note: 'D4', duration: 0.5 }, { note: '_', duration: 0.25 },
  { note: 'E4', duration: 0.25 }, { note: 'G4', duration: 0.75 }, { note: '_', duration: 0.5 },
];
const MINESWEEPER_BASS: NoteEntry[] = [
  { note: 'E2', duration: 1.0 }, { note: '_', duration: 0.5 },
  { note: 'A2', duration: 1.0 }, { note: '_', duration: 0.5 },
  { note: 'G2', duration: 1.0 }, { note: '_', duration: 0.5 },
  { note: 'E2', duration: 1.0 }, { note: '_', duration: 0.5 },
];

// Solitaire: relaxed, jazzy
const SOLITAIRE_MELODY: NoteEntry[] = [
  { note: 'C5', duration: 0.3 }, { note: 'E5', duration: 0.3 }, { note: 'G5', duration: 0.6 },
  { note: 'F5', duration: 0.3 }, { note: 'E5', duration: 0.3 }, { note: 'D5', duration: 0.6 },
  { note: 'E5', duration: 0.3 }, { note: 'D5', duration: 0.3 }, { note: 'C5', duration: 0.6 },
  { note: 'D5', duration: 0.3 }, { note: 'E5', duration: 0.3 }, { note: 'C5', duration: 0.6 },
  { note: '_', duration: 0.3 },
];
const SOLITAIRE_BASS: NoteEntry[] = [
  { note: 'C3', duration: 0.6 }, { note: 'G2', duration: 0.6 },
  { note: 'F2', duration: 0.6 }, { note: 'G2', duration: 0.6 },
  { note: 'A2', duration: 0.6 }, { note: 'E2', duration: 0.6 },
  { note: 'F2', duration: 0.6 }, { note: 'C3', duration: 0.6 },
  { note: '_', duration: 0.3 },
];

// Game Over sound: descending notes
const GAME_OVER_NOTES: NoteEntry[] = [
  { note: 'E5', duration: 0.15 }, { note: 'D5', duration: 0.15 },
  { note: 'C5', duration: 0.15 }, { note: 'B4', duration: 0.15 },
  { note: 'A4', duration: 0.15 }, { note: 'G4', duration: 0.15 },
  { note: 'F4', duration: 0.2 }, { note: 'E4', duration: 0.4 },
];

// Start sound: ascending notes
const START_NOTES: NoteEntry[] = [
  { note: 'C4', duration: 0.1 }, { note: 'E4', duration: 0.1 },
  { note: 'G4', duration: 0.1 }, { note: 'C5', duration: 0.1 },
  { note: 'E5', duration: 0.15 }, { note: 'G5', duration: 0.25 },
];

// ── ChiptunePlayer Class ───────────────────────────────────

export class ChiptunePlayer {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private melodyTimeouts: ReturnType<typeof setTimeout>[] = [];
  private bassTimeouts: ReturnType<typeof setTimeout>[] = [];
  private sfxTimeouts: ReturnType<typeof setTimeout>[] = [];
  private activeOscillators: OscillatorNode[] = [];
  private isPlaying = false;
  private currentTrack: string | null = null;
  private volume = 0.15;
  private loopTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playNote(
    freq: number,
    startTime: number,
    duration: number,
    waveType: OscillatorType,
    volumeScale: number = 1
  ): OscillatorNode | null {
    if (freq === 0) return null; // rest
    const ctx = this.ensureContext();
    if (!this.gainNode) return null;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.value = freq;

    // Envelope: quick attack, sustain, quick release
    const attackTime = 0.01;
    const releaseTime = Math.min(0.05, duration * 0.2);
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(volumeScale, startTime + attackTime);
    noteGain.gain.setValueAtTime(volumeScale, startTime + duration - releaseTime);
    noteGain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);

    this.activeOscillators.push(osc);
    osc.onended = () => {
      const idx = this.activeOscillators.indexOf(osc);
      if (idx !== -1) this.activeOscillators.splice(idx, 1);
    };

    return osc;
  }

  private scheduleTrack(
    melody: NoteEntry[],
    bass: NoteEntry[],
    trackName: string,
    loop: boolean = true
  ) {
    const ctx = this.ensureContext();
    const startTime = ctx.currentTime + 0.05;

    // Schedule melody (square wave)
    let melodyTime = startTime;
    for (const entry of melody) {
      const freq = NOTE_FREQ[entry.note] || 0;
      this.playNote(freq, melodyTime, entry.duration * 0.95, 'square', 0.6);
      melodyTime += entry.duration;
    }
    const melodyDuration = melodyTime - startTime;

    // Schedule bass (triangle wave)
    let bassTime = startTime;
    const totalBass = bass.reduce((sum, e) => sum + e.duration, 0);
    // Repeat bass to fill melody duration
    let bassElapsed = 0;
    while (bassElapsed < melodyDuration) {
      for (const entry of bass) {
        if (bassElapsed >= melodyDuration) break;
        const freq = NOTE_FREQ[entry.note] || 0;
        this.playNote(freq, startTime + bassElapsed, entry.duration * 0.9, 'triangle', 0.4);
        bassElapsed += entry.duration;
      }
      if (totalBass === 0) break;
    }

    // Loop
    if (loop) {
      const loopDelay = melodyDuration * 1000;
      this.loopTimeoutId = setTimeout(() => {
        if (this.isPlaying && this.currentTrack === trackName) {
          this.scheduleTrack(melody, bass, trackName, true);
        }
      }, loopDelay);
    }
  }

  private playSfx(notes: NoteEntry[]) {
    const ctx = this.ensureContext();
    const startTime = ctx.currentTime + 0.02;
    let time = startTime;
    for (const entry of notes) {
      const freq = NOTE_FREQ[entry.note] || 0;
      this.playNote(freq, time, entry.duration * 0.9, 'square', 0.8);
      time += entry.duration;
    }
  }

  private startTrack(melody: NoteEntry[], bass: NoteEntry[], trackName: string) {
    if (this.currentTrack === trackName && this.isPlaying) return;
    this.stop();
    this.isPlaying = true;
    this.currentTrack = trackName;
    this.scheduleTrack(melody, bass, trackName, true);
  }

  // ── Public API ───────────────────────────────────────────

  playMenuMusic() {
    this.startTrack(MENU_MELODY, MENU_BASS, 'menu');
  }

  playTetrisMusic() {
    this.startTrack(TETRIS_MELODY, TETRIS_BASS, 'tetris');
  }

  playSnakeMusic() {
    this.startTrack(SNAKE_MELODY, SNAKE_BASS, 'snake');
  }

  playSpaceWarMusic() {
    this.startTrack(SPACEWAR_MELODY, SPACEWAR_BASS, 'spacewar');
  }

  playPacmanMusic() {
    this.startTrack(PACMAN_MELODY, PACMAN_BASS, 'pacman');
  }

  playMinesweeperMusic() {
    this.startTrack(MINESWEEPER_MELODY, MINESWEEPER_BASS, 'minesweeper');
  }

  playSolitaireMusic() {
    this.startTrack(SOLITAIRE_MELODY, SOLITAIRE_BASS, 'solitaire');
  }

  playGameOverSound() {
    this.playSfx(GAME_OVER_NOTES);
  }

  playStartSound() {
    this.playSfx(START_NOTES);
  }

  stop() {
    this.isPlaying = false;
    this.currentTrack = null;

    // Clear loop timeout
    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }

    // Clear scheduled timeouts
    for (const t of this.melodyTimeouts) clearTimeout(t);
    for (const t of this.bassTimeouts) clearTimeout(t);
    for (const t of this.sfxTimeouts) clearTimeout(t);
    this.melodyTimeouts = [];
    this.bassTimeouts = [];
    this.sfxTimeouts = [];

    // Stop active oscillators
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.activeOscillators = [];
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  isMuted(): boolean {
    return this.volume === 0;
  }

  toggleMute(): boolean {
    if (this.volume > 0) {
      this._prevVolume = this.volume;
      this.setVolume(0);
      return true; // now muted
    } else {
      this.setVolume(this._prevVolume || 0.15);
      return false; // now unmuted
    }
  }

  private _prevVolume: number = 0.15;

  destroy() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.gainNode = null;
  }
}

// Web Audio API Synthesizer for Duolingo UI Chimes & Web Speech API TTS

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  startTimeOffset = 0,
  gainValue = 0.14
): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset);

    gain.gain.setValueAtTime(0.001, ctx.currentTime + startTimeOffset);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + startTimeOffset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTimeOffset + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTimeOffset);
    osc.stop(ctx.currentTime + startTimeOffset + durationSec + 0.02);
  } catch {
    // Ignore audio context restriction errors
  }
}

export function playCorrectSound(enabled = true): void {
  if (!enabled) return;
  // Iconic Duolingo two-note ascending bright chime (E5 -> B5)
  playTone(659.25, 0.13, 'triangle', 0, 0.16);
  playTone(987.77, 0.28, 'triangle', 0.11, 0.18);
}

export function playWrongSound(enabled = true): void {
  if (!enabled) return;
  // Low descending double buzz (E3 -> C3)
  playTone(196.0, 0.15, 'sawtooth', 0, 0.11);
  playTone(146.83, 0.25, 'sawtooth', 0.12, 0.12);
}

export function playClickSound(enabled = true): void {
  if (!enabled) return;
  playTone(520, 0.045, 'sine', 0, 0.08);
}

export function playChestSound(enabled = true): void {
  if (!enabled) return;
  // Treasure chest arpeggio
  playTone(523.25, 0.12, 'triangle', 0, 0.14);
  playTone(659.25, 0.12, 'triangle', 0.09, 0.14);
  playTone(783.99, 0.12, 'triangle', 0.18, 0.15);
  playTone(1046.5, 0.35, 'triangle', 0.27, 0.18);
}

export function playFanfareSound(enabled = true): void {
  if (!enabled) return;
  // Lesson completion fanfare
  playTone(523.25, 0.14, 'triangle', 0, 0.15);
  playTone(659.25, 0.14, 'triangle', 0.12, 0.15);
  playTone(783.99, 0.14, 'triangle', 0.24, 0.16);
  playTone(1046.5, 0.42, 'triangle', 0.36, 0.2);
}

export function speakText(text: string, langCode = 'en-US', slow = false): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    playClickSound(true);
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = slow ? 0.58 : 0.96;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  } catch {
    playClickSound(true);
  }
}

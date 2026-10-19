// Web Audio API Synthesizer for SafeKids Alerts and Chimes

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play high-priority SOS emergency siren
 */
export function playSOSSiren(durationSeconds = 3): () => void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);

    // Siren frequency sweep up and down
    const now = ctx.currentTime;
    for (let i = 0; i < durationSeconds * 2; i++) {
      const t = now + i * 0.5;
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.25);
      osc.frequency.linearRampToValueAtTime(700, t + 0.5);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    const stopTimer = setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    }, durationSeconds * 1000);

    return () => {
      clearTimeout(stopTimer);
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    };
  } catch (e) {
    console.warn("Audio playback error", e);
    return () => {};
  }
}

/**
 * Play friendly notification chime
 */
export function playNotificationChime(): void {
  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + index * 0.12;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (e) {
    console.warn("Chime playback error", e);
  }
}

/**
 * Play camera/screen request incoming bell
 */
export function playRequestIncomingBell(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(1100, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    console.warn("Bell playback error", e);
  }
}

/**
 * Play warning beep
 */
export function playWarningBeep(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "square";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(330, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.warn("Beep error", e);
  }
}

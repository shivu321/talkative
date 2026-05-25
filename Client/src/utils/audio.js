// src/utils/audio.js

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Play a synthesized tone
 * @param {AudioContext} ctx 
 * @param {number} freq - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {number} volume - Volume scale (0.0 to 1.0)
 * @param {number} delay - Start delay in seconds
 * @param {string} type - Oscillator type ('sine', 'triangle', etc.)
 */
const playTone = (ctx, freq, duration, volume = 0.1, delay = 0, type = "sine") => {
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    
    // Smooth gain envelope to avoid clicking
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    console.warn("Audio Context playback failed", e);
  }
};

export const playSentSound = () => {
  try {
    const ctx = getAudioContext();
    // A quick clean chirpy beep (typical message sent)
    playTone(ctx, 1200, 0.06, 0.08, 0, "sine");
  } catch {}
};

export const playReceivedSound = () => {
  try {
    const ctx = getAudioContext();
    // Signature WhatsApp-style double-beep
    playTone(ctx, 1050, 0.08, 0.08, 0, "sine");
    playTone(ctx, 1250, 0.1, 0.08, 0.06, "sine");
  } catch {}
};

export const playConnectedSound = () => {
  try {
    const ctx = getAudioContext();
    // Uplifting ascending clean chime
    playTone(ctx, 523.25, 0.12, 0.06, 0, "sine");      // C5
    playTone(ctx, 659.25, 0.12, 0.06, 0.08, "sine");   // E5
    playTone(ctx, 783.99, 0.16, 0.06, 0.16, "sine");   // G5
  } catch {}
};

export const playDisconnectedSound = () => {
  try {
    const ctx = getAudioContext();
    // Soft descending warning chime
    playTone(ctx, 659.25, 0.12, 0.06, 0, "sine");      // E5
    playTone(ctx, 523.25, 0.16, 0.06, 0.08, "sine");   // C5
    playTone(ctx, 392.00, 0.22, 0.06, 0.16, "sine");   // G4
  } catch {}
};

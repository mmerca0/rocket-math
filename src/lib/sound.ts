/**
 * Simple sound effects made in code with the browser's Web Audio API.
 * No audio files. iPad/iPhone only allow sound after a tap, so call
 * unlockSound() from a button press (we do it on "Launch").
 */

export type SoundName =
  "blast" | "oops" | "shieldLost" | "levelUp" | "click" | "fire";

let ctx: AudioContext | null = null;
let muted = false;

export function setSoundMuted(value: boolean) {
  muted = value;
}

export function unlockSound() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(
  c: AudioContext,
  {
    freq,
    to,
    start = 0,
    dur,
    type = "sine",
    vol = 0.2,
  }: {
    freq: number;
    to?: number;
    start?: number;
    dur: number;
    type?: OscillatorType;
    vol?: number;
  },
) {
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(c: AudioContext, dur: number, vol: number) {
  const buffer = c.createBuffer(
    1,
    Math.floor(c.sampleRate * dur),
    c.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}

export function playSound(name: SoundName) {
  if (muted || !ctx || ctx.state !== "running") return;
  const c = ctx;
  try {
    switch (name) {
      case "blast":
        noise(c, 0.35, 0.35);
        tone(c, {
          freq: 660,
          to: 1320,
          dur: 0.12,
          type: "triangle",
          vol: 0.15,
        });
        break;
      case "fire":
        tone(c, { freq: 900, to: 300, dur: 0.18, type: "square", vol: 0.06 });
        break;
      case "oops":
        // Soft, low "bonk" — not a harsh buzzer.
        tone(c, { freq: 220, to: 160, dur: 0.25, type: "sine", vol: 0.25 });
        break;
      case "shieldLost":
        tone(c, { freq: 330, to: 110, dur: 0.45, type: "triangle", vol: 0.2 });
        break;
      case "levelUp":
        [523, 659, 784, 1047].forEach((f, i) =>
          tone(c, {
            freq: f,
            start: i * 0.11,
            dur: 0.22,
            type: "triangle",
            vol: 0.18,
          }),
        );
        break;
      case "click":
        tone(c, { freq: 1000, dur: 0.04, type: "sine", vol: 0.08 });
        break;
    }
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}

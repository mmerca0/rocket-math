/** Gentle, encouraging messages. Picked in order so they vary without randomness. */

export const PRAISE = [
  "Nice blast!",
  "Great job!",
  "Boom! You got it!",
  "Super pilot!",
  "Awesome!",
  "Out of this world!",
  "You're on fire!",
  "Stellar!",
];

export const OOPS = [
  "Close! Try another one.",
  "Almost! Have another look.",
  "Oops — you've got this!",
  "Not that one. Keep going!",
];

export function cycle(list: readonly string[], n: number): string {
  return list[((n % list.length) + list.length) % list.length] ?? "";
}

export function missedMessage(answer: number): string {
  return `It was ${answer}. You'll get the next one!`;
}

/** Headline on the round summary. */
export function summaryMessage(acc: number, shieldsLeft: number): string {
  if (shieldsLeft === 0)
    return "Shields down! Every pilot practises — try again!";
  if (acc >= 0.95) return "Incredible flying, pilot!";
  if (acc >= 0.8) return "Great mission!";
  if (acc >= 0.6) return "Good flying — you're getting stronger!";
  return "Nice try! Practice makes pilots.";
}

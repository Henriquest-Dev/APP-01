/**
 * Placeholder community data until the backend exists.
 * Values are deterministic per coin so the UI is stable between renders.
 */
export function demoConsensus(coinId: string): { up: number; votes: number } {
  const h = hash(coinId);
  return { up: 35 + (h % 45), votes: 200 + (h % 4800) };
}

export const demoLeaderboard = [
  { name: 'satoshi_fan', accuracy: 78, calls: 142 },
  { name: 'moonwalker', accuracy: 74, calls: 98 },
  { name: 'kaya.eth', accuracy: 71, calls: 210 },
  { name: 'maputo_trader', accuracy: 69, calls: 64 },
  { name: 'degen_daniel', accuracy: 66, calls: 301 },
  { name: 'solsister', accuracy: 64, calls: 87 },
  { name: 'chartwizard', accuracy: 62, calls: 156 },
  { name: 'hodl_amina', accuracy: 61, calls: 45 },
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

import { monuments } from "./data";
const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
function ratio(a: string, b: string) { // Dice coefficient on bigrams
  if (a.length < 2 || b.length < 2) return 0;
  const bg = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let inter = 0;
  for (const [g, c] of A) inter += Math.min(c, B.get(g) || 0);
  return (2 * inter) / (a.length + b.length - 2);
}
export function linkPlaces(names: string[]) {
  const best = new Map<string, number>();
  for (const n of names) {
    const nn = norm(n); if (nn.length < 3) continue;
    for (const m of monuments) {
      const mn = norm(m.name);
      const s = (mn.length >= 5 && nn.length >= 5 && (mn.includes(nn) || nn.includes(mn))) ? 1 : ratio(nn, mn);
      if (s >= 0.8 && s > (best.get(m.id) || 0)) best.set(m.id, +s.toFixed(2));
    }
  }
  return [...best].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, score]) => ({ id, score }));
}

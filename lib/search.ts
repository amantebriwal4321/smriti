// Small in-memory BM25 index. Rebuilt once per server instance; ~400 docs so it is cheap.
import { docs } from "./data";
import type { Doc } from "./types";

const tok = (s: string) => s.toLowerCase().normalize("NFKC").split(/[^\p{L}\p{N}\p{M}]+/u).filter((t) => t.length > 1);
const N = docs.length;
const tfs = docs.map((d) => { const m = new Map<string, number>(); for (const t of tok(d.title + " " + d.title + " " + d.text)) m.set(t, (m.get(t) || 0) + 1); return m; });
const lens = tfs.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
const avg = lens.reduce((a, b) => a + b, 0) / N;
const df = new Map<string, number>();
for (const m of tfs) for (const t of m.keys()) df.set(t, (df.get(t) || 0) + 1);

export function search(q: string, k = 8, type?: Doc["type"]): (Doc & { score: number })[] {
  const qt = [...new Set(tok(q))];
  const out: (Doc & { score: number })[] = [];
  docs.forEach((d, i) => {
    if (type && d.type !== type) return;
    let s = 0;
    for (const t of qt) {
      const f = tfs[i].get(t); if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
      s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * lens[i] / avg));
    }
    if (s > 0) out.push({ ...d, score: s });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, k);
}

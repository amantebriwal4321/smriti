"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Monument, Item } from "@/lib/types";
import type { Pin } from "./colors";
import { KIND_COLOR } from "./colors";
import Detail from "./Detail";
import Ask from "./Ask";
import Ingest from "./Ingest";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="h-full grid place-items-center text-muted pulse">Loading map…</div> });

const KIND_LABEL: Record<string, string> = { photo: "Photo", scan: "Scan", journal: "Journal", upload: "Your upload" };
export type Sel = { type: "item"; item: Item } | { type: "monument"; m: Monument } | null;

export default function App({ monuments, archive }: { monuments: Monument[]; archive: Item[] }) {
  const monById = useMemo(() => new Map(monuments.map((m) => [m.id, m])), [monuments]);
  const [tab, setTab] = useState<"explore" | "ask" | "ingest">("explore");
  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<any[] | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [fly, setFly] = useState<[number, number, number] | null>(null);
  const [showMon, setShowMon] = useState(true);
  const [uploads, setUploads] = useState<Item[]>([]);

  const all = useMemo(() => [...uploads, ...archive], [uploads, archive]);
  const pins: Pin[] = useMemo(() => {
    const seen = new Map<string, number>();
    const out: Pin[] = [];
    for (const it of all) {
      const m = it.links[0] && monById.get(it.links[0].id);
      const base = m ? [m.lat, m.lng] : it.geo ? [it.geo.lat, it.geo.lng] : null;
      if (!base) continue;
      const k = base.join(","); const n = seen.get(k) || 0; seen.set(k, n + 1);
      const ang = n * 2.4, r = n ? 0.035 * Math.sqrt(n) : 0; // golden-angle spread for items sharing a spot
      if (kind !== "all" && it.kind !== kind) continue;
      out.push({ key: it.id, lat: base[0] + r * Math.sin(ang), lng: base[1] + r * Math.cos(ang), kind: (it as any).upload ? "upload" : it.kind, label: it.ai?.title || it.kind, item: it });
    }
    return out;
  }, [all, monById, kind]);

  const listed = all.filter((it) => kind === "all" || it.kind === kind);
  const counts = { photo: archive.filter((a) => a.kind === "photo").length, scan: archive.filter((a) => a.kind === "scan").length, journal: archive.filter((a) => a.kind === "journal").length };

  function openItem(it: Item) {
    setSel({ type: "item", item: it });
    const m = it.links[0] && monById.get(it.links[0].id);
    if (m) setFly([m.lat, m.lng, 11]); else if (it.geo) setFly([it.geo.lat, it.geo.lng, 9]);
  }
  function openMon(m: Monument) { setSel({ type: "monument", m }); setFly([m.lat, m.lng, 12]); }
  function openKey(key: string) {
    const it = all.find((a) => a.id === key); if (it) return openItem(it);
    const m = monById.get(key); if (m) openMon(m);
  }
  async function runSearch(v: string) {
    setQ(v);
    if (!v.trim()) return setHits(null);
    const r = await fetch("/api/search?q=" + encodeURIComponent(v)).then((r) => r.json());
    setHits(r.results);
  }

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-line bg-ink2/90 backdrop-blur z-[1000]">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl text-saffron">स्मृति</span>
          <span className="font-serif text-xl tracking-wide">Smriti</span>
        </div>
        <span className="hidden md:block text-xs text-muted">heritage archives, read, translated and mapped</span>
        <div className="ml-auto flex gap-4 text-xs text-muted">
          <span><b className="text-parch">{monuments.length}</b> monuments</span>
          <span><b className="text-parch">{archive.length}</b> archive items</span>
          <span className="hidden sm:inline">EN · हिन्दी · ಕನ್ನಡ</span>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 flex-col md:flex-row">
        <aside className="md:w-[420px] w-full md:h-full h-[55%] order-2 md:order-1 flex flex-col border-r border-line bg-ink2 grain min-h-0">
          <nav className="flex p-2 gap-1 border-b border-line">
            {([["explore", "Explore"], ["ask", "Ask the archive"], ["ingest", "Add to archive"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-md text-sm transition ${tab === k ? "bg-saffron text-ink font-semibold" : "text-muted hover:bg-ink3"}`}>{l}</button>
            ))}
          </nav>

          {tab === "explore" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="p-3 space-y-2">
                <input value={q} onChange={(e) => runSearch(e.target.value)} placeholder="Search: hero stone, Vijayanagara, ghats, vastu, हम्पी…"
                  className="w-full rounded-lg bg-ink px-3 py-2.5 text-sm border border-line focus:border-saffron outline-none" />
                <div className="flex gap-1.5 flex-wrap text-xs">
                  {[["all", `All ${archive.length}`], ["photo", `Photos ${counts.photo}`], ["scan", `Scans ${counts.scan}`], ["journal", `Journals ${counts.journal}`]].map(([k, l]) => (
                    <button key={k} onClick={() => setKind(k)} className={`px-2.5 py-1 rounded-full border ${kind === k ? "border-saffron text-saffron" : "border-line text-muted"}`}>
                      {k !== "all" && <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: KIND_COLOR[k] }} />}{l}
                    </button>
                  ))}
                  <label className="ml-auto flex items-center gap-1 text-muted"><input type="checkbox" checked={showMon} onChange={(e) => setShowMon(e.target.checked)} />monuments</label>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scroll px-3 pb-3 space-y-2">
                {hits ? (
                  hits.length ? hits.map((h) => (
                    <button key={h.key} onClick={() => openKey(h.key)} className="fade-in w-full text-left p-3 rounded-lg bg-ink/70 border border-line hover:border-saffron">
                      <div className="text-[10px] uppercase tracking-wider text-saffron">{h.type === "monument" ? "Monument" : "Archive item"} · score {h.score.toFixed(1)}</div>
                      <div className="font-serif">{h.title}</div>
                      <div className="text-xs text-muted line-clamp-2 indic">{h.snippet}</div>
                    </button>
                  )) : <p className="text-sm text-muted p-2">No matches. Try another spelling or ask the archive.</p>
                ) : listed.map((it) => <Card key={it.id} it={it} monById={monById} onClick={() => openItem(it)} active={sel?.type === "item" && sel.item.id === it.id} />)}
              </div>
            </div>
          )}
          {tab === "ask" && <Ask onCite={openKey} />}
          {tab === "ingest" && <Ingest onDone={(it) => { setUploads((u) => [it, ...u]); openItem(it); }} />}
        </aside>

        <main className="flex-1 relative order-1 md:order-2 min-h-0">
          <MapView monuments={monuments} pins={pins} showMonuments={showMon} onMonument={openMon} onPin={(p) => p.item && openItem(p.item)} flyTo={fly} activeKey={sel?.type === "item" ? sel.item.id : null} />
          <div className="absolute left-3 bottom-6 z-[500] bg-ink2/90 border border-line rounded-lg px-3 py-2 text-xs space-y-1">
            {Object.entries(KIND_LABEL).map(([k, l]) => <div key={k} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{l}</div>)}
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-saffron" />UNESCO site</div>
          </div>
          {sel && <Detail sel={sel} monById={monById} all={all} onClose={() => setSel(null)} onItem={openItem} onMon={openMon} />}
        </main>
      </div>
    </div>
  );
}

function Card({ it, monById, onClick, active }: { it: Item; monById: Map<string, Monument>; onClick: () => void; active: boolean }) {
  const m = it.links[0] && monById.get(it.links[0].id);
  return (
    <button onClick={onClick} className={`fade-in w-full flex gap-3 text-left p-2 rounded-lg border transition ${active ? "border-saffron bg-ink3" : "border-line bg-ink/60 hover:border-muted"}`}>
      {it.image ? <img src={it.image} alt="" loading="lazy" className="w-16 h-16 rounded object-cover shrink-0" />
        : <div className="w-16 h-16 rounded shrink-0 grid place-items-center bg-ink3 font-serif text-2xl text-indigo">“</div>}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: KIND_COLOR[(it as any).upload ? "upload" : it.kind] }}>{(it as any).upload ? "Your upload" : it.kind}{it.ai?.language ? ` · ${it.ai.language}` : ""}</div>
        <div className="font-serif leading-snug truncate">{it.ai?.title || it.orig_title}</div>
        <div className="text-xs text-muted truncate">{m ? `📍 ${m.name}` : it.geo ? `📍 ${it.geo.query}` : "Place unknown"}{it.ai?.era || it.ai?.author_era ? ` · ${it.ai.era || it.ai.author_era}` : ""}</div>
      </div>
    </button>
  );
}

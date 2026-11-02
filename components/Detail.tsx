"use client";
import { useState } from "react";
import type { Monument, Item } from "@/lib/types";
import type { Sel } from "./App";

export default function Detail({ sel, monById, all, onClose, onItem, onMon }: { sel: NonNullable<Sel>; monById: Map<string, Monument>; all: Item[]; onClose: () => void; onItem: (i: Item) => void; onMon: (m: Monument) => void }) {
  return (
    <div className="fade-in absolute top-3 right-3 bottom-3 w-[min(460px,calc(100%-24px))] z-[600] bg-ink2/97 border border-line rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <button onClick={onClose} aria-label="Close" className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-ink/80 text-muted hover:text-parch">✕</button>
      <div className="overflow-y-auto scroll flex-1">
        {sel.type === "item" ? <ItemView it={sel.item} monById={monById} onMon={onMon} key={sel.item.id} /> : <MonView m={sel.m} all={all} onItem={onItem} />}
      </div>
    </div>
  );
}

function ItemView({ it, monById, onMon }: { it: Item; monById: Map<string, Monument>; onMon: (m: Monument) => void }) {
  const a = it.ai || {};
  const tabs = [
    ["orig", "Original", a.ocr_text || it.text],
    ["en", "English", a.translation_en || a.summary],
    ["hi", "हिन्दी", a.translation_hi || a.summary_hi],
    ["kn", "ಕನ್ನಡ", a.translation_kn || a.summary_kn],
  ].filter((t) => t[2]) as [string, string, string][];
  const [t, setT] = useState(tabs[0]?.[0]);
  const cur = tabs.find((x) => x[0] === t);
  return (
    <div>
      {it.image && <a href={it.image} target="_blank"><img src={it.image} alt={a.title} className="w-full max-h-72 object-cover bg-black" /></a>}
      <div className="p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-saffron">{(it as any).upload ? "Your upload" : it.kind} archive item</div>
        <h2 className="font-serif text-2xl leading-tight">{a.title || it.orig_title}</h2>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[a.language, a.script, a.era || a.author_era, a.style].filter(Boolean).map((x: string) => <span key={x} className="px-2 py-0.5 rounded-full bg-ink3 text-muted">{x}</span>)}
          {typeof a.confidence === "number" && <span className="px-2 py-0.5 rounded-full bg-ink3" style={{ color: a.confidence > 0.6 ? "#4fb3a9" : "#e8a33d" }}>OCR confidence {Math.round(a.confidence * 100)}%</span>}
        </div>
        {a.summary && <p className="text-sm text-parch/90">{a.summary}</p>}
        {tabs.length > 0 && (
          <div className="rounded-lg border border-line overflow-hidden">
            <div className="flex bg-ink">{tabs.map(([k, l]) => <button key={k} onClick={() => setT(k)} className={`flex-1 py-1.5 text-xs ${t === k ? "bg-ink3 text-saffron" : "text-muted"}`}>{l}</button>)}</div>
            <p className="indic text-sm p-3 whitespace-pre-wrap max-h-64 overflow-y-auto scroll">{cur?.[2]}</p>
          </div>
        )}
        {a.quotes?.length > 0 && a.quotes.map((q: string) => <blockquote key={q} className="font-serif italic text-parch/80 border-l-2 border-indigo pl-3 text-sm">“{q}”</blockquote>)}
        {it.links.length > 0 && (
          <div>
            <div className="text-xs text-muted mb-1">Linked monuments</div>
            <div className="flex flex-wrap gap-1.5">{it.links.map((l) => { const m = monById.get(l.id); return m && <button key={l.id} onClick={() => onMon(m)} className="px-2.5 py-1 rounded-full border border-saffron/60 text-saffron text-xs hover:bg-saffron hover:text-ink">📍 {m.name} <span className="opacity-60">{Math.round(l.score * 100)}%</span></button>; })}</div>
          </div>
        )}
        {!it.links.length && it.geo && <div className="text-xs text-muted">📍 Placed by geocoding “{it.geo.query}” on OpenStreetMap</div>}
        {a.tags?.length > 0 && <div className="flex flex-wrap gap-1 text-[11px] text-muted">{a.tags.map((x: string) => <span key={x}>#{x.replace(/\s+/g, "")}</span>)}</div>}
        {it.source && <div className="text-[11px] text-muted border-t border-line pt-2">Source: <a className="text-saffron underline" href={it.source} target="_blank">{it.author || "link"}</a> · {it.license}</div>}
      </div>
    </div>
  );
}

function MonView({ m, all, onItem }: { m: Monument; all: Item[]; onItem: (i: Item) => void }) {
  const linked = all.filter((it) => it.links.some((l) => l.id === m.id));
  return (
    <div className="p-4 space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-saffron">Monument{m.unesco ? " · UNESCO World Heritage" : ""}</div>
      <h2 className="font-serif text-2xl">{m.name}</h2>
      <div className="text-xs text-muted">{m.state} · {m.lat.toFixed(4)}, {m.lng.toFixed(4)}</div>
      {m.summary && <p className="text-sm">{m.summary}</p>}
      {m.history && <details className="text-sm text-parch/85"><summary className="cursor-pointer text-saffron text-xs">History</summary><p className="mt-1">{m.history}</p></details>}
      {m.architecture && <details className="text-sm text-parch/85"><summary className="cursor-pointer text-saffron text-xs">Architecture</summary><p className="mt-1">{m.architecture}</p></details>}
      <div>
        <div className="text-xs text-muted mb-1">{linked.length ? `${linked.length} archive item${linked.length > 1 ? "s" : ""} linked here` : "No archive items linked yet"}</div>
        <div className="grid grid-cols-3 gap-2">{linked.map((it) => (
          <button key={it.id} onClick={() => onItem(it)} className="text-left">
            {it.image ? <img src={it.image} alt="" className="w-full h-20 object-cover rounded" /> : <div className="h-20 rounded bg-ink3 grid place-items-center text-indigo font-serif text-xs p-1 text-center">{it.ai?.title}</div>}
          </button>))}</div>
      </div>
      <div className="text-[11px] text-muted border-t border-line pt-2">Text: Wikipedia (CC BY-SA 4.0) · {m.wiki && <a className="text-saffron underline" href={m.wiki} target="_blank">article</a>} · {m.wikidata && <a className="text-saffron underline" href={m.wikidata} target="_blank">Wikidata</a>}</div>
    </div>
  );
}

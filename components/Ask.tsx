"use client";
import { useState } from "react";

const SUGGEST: Record<string, string[]> = {
  en: ["What did Domingo Paes see in the streets of Vijayanagara?", "What do the Kannada hero stones commemorate?", "Which wood does the Vastu manuscript recommend for houses?", "How did Mark Twain describe the Taj Mahal?"],
  hi: ["हम्पी का इतिहास क्या है?", "बनारस के घाटों के बारे में मार्क ट्वेन ने क्या लिखा?"],
  kn: ["ಹಂಪಿಯ ವಿಜಯನಗರ ಸಾಮ್ರಾಜ್ಯದ ಬಗ್ಗೆ ತಿಳಿಸಿ", "ವೀರಗಲ್ಲು ಎಂದರೇನು?"],
};

export default function Ask({ onCite }: { onCite: (key: string) => void }) {
  const [lang, setLang] = useState("en");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  async function ask(question: string) {
    setQ(question); setBusy(true); setRes(null);
    try { setRes(await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, lang }) }).then((r) => r.json())); }
    catch { setRes({ error: "Network error, try again." }); }
    setBusy(false);
  }
  const render = (s: string) => s.split(/(\[\d+\])/g).map((p, i) => {
    const m = p.match(/^\[(\d+)\]$/); const src = m && res?.sources?.[+m[1] - 1];
    return src ? <button key={i} onClick={() => onCite(src.key)} className="mx-0.5 px-1.5 rounded bg-saffron/20 text-saffron text-xs align-super hover:bg-saffron hover:text-ink">{m![1]}</button> : <span key={i}>{p}</span>;
  });
  return (
    <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-y-auto scroll">
      <div className="flex gap-1 text-xs">{[["en", "English"], ["hi", "हिन्दी"], ["kn", "ಕನ್ನಡ"]].map(([k, l]) => <button key={k} onClick={() => setLang(k)} className={`px-3 py-1 rounded-full border ${lang === k ? "border-saffron text-saffron" : "border-line text-muted"}`}>{l}</button>)}<span className="ml-auto text-muted self-center">answers cite the archive</span></div>
      <form onSubmit={(e) => { e.preventDefault(); q.trim() && ask(q); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask in English, हिन्दी or ಕನ್ನಡ" className="flex-1 rounded-lg bg-ink px-3 py-2.5 text-sm border border-line focus:border-saffron outline-none" />
        <button disabled={busy} className="px-4 rounded-lg bg-saffron text-ink font-semibold text-sm disabled:opacity-50">Ask</button>
      </form>
      <div className="flex flex-wrap gap-1.5">{SUGGEST[lang].map((s) => <button key={s} onClick={() => ask(s)} className="indic text-left text-xs px-2.5 py-1.5 rounded-lg bg-ink/60 border border-line text-muted hover:border-saffron hover:text-parch">{s}</button>)}</div>
      {busy && <div className="text-sm text-muted pulse">Retrieving sources and writing a cited answer…</div>}
      {res && (
        <div className="fade-in space-y-3">
          {res.error ? <p className="text-sm text-vermil">{res.error}</p> : <p className="indic text-[15px] leading-relaxed bg-ink/60 border border-line rounded-lg p-3">{render(res.answer || "")}</p>}
          {res.sources?.length > 0 && <div>
            <div className="text-xs text-muted mb-1">Sources retrieved (BM25)</div>
            {res.sources.map((s: any, i: number) => <button key={s.key} onClick={() => onCite(s.key)} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-ink3 ${res.used?.includes(i + 1) ? "text-parch" : "text-muted"}`}><span className="text-saffron mr-1">[{i + 1}]</span>{s.title} <span className="opacity-60">· {s.type}</span></button>)}
          </div>}
          {res.model && <div className="text-[10px] text-muted">model: {res.model}</div>}
        </div>
      )}
    </div>
  );
}

"use client";
import { useRef, useState } from "react";
import type { Item } from "@/lib/types";

const STAGES = ["Upload", "OCR", "Translate", "Extract places", "Link + map"];
const SAMPLES = [
  { label: "Devanagari book cover, 1925", url: "/archive/scan_Mudrarakshas_Bharatendu_Harishchandra_1925_djvu_org.jpg" },
  { label: "Old Kannada temple inscription", url: "/archive/scan_11th_12th_century_Iswara_temple_Kamaleshwara_Kalleswara_Kaml.jpg" },
  { label: "Ramayana folio, Devanagari", url: "/archive/scan_Folio_from_a_Ramayana_manuscript_text_in_Devanagar_909855_jp.jpg" },
];

async function shrink(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.85));
}

export default function Ingest({ onDone }: { onDone: (it: Item) => void }) {
  const [stage, setStage] = useState(-1);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const inp = useRef<HTMLInputElement>(null);

  async function run(blob: Blob | null, txt = "") {
    setErr(""); setStage(0);
    const fd = new FormData();
    let img: string | undefined;
    if (blob) { const small = await shrink(blob); img = URL.createObjectURL(small); setPreview(img); fd.append("file", small, "upload.jpg"); }
    else fd.append("text", txt);
    let s = 1; setStage(1);
    const tick = setInterval(() => { s = Math.min(s + 1, 3); setStage(s); }, 2200);
    try {
      const r = await fetch("/api/ingest", { method: "POST", body: fd });
      const d = await r.json();
      clearInterval(tick);
      if (!r.ok) throw new Error(d.error || "Failed");
      setStage(4);
      await new Promise((r) => setTimeout(r, 500));
      setStage(5);
      const kind = d.ai.kind === "photo" || d.ai.kind === "journal" ? d.ai.kind : "scan";
      onDone({ id: "u" + Date.now(), kind, image: img, text: txt || undefined, ai: d.ai, links: d.links, geo: d.geo || undefined, upload: true, source: undefined } as any);
    } catch (e: any) { clearInterval(tick); setErr(e.message); setStage(-1); }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll p-3 space-y-3">
      <p className="text-sm text-muted">Drop a monument photo, a Hindi or Kannada document scan, or paste a travel journal passage. Smriti reads it, translates it into English, Hindi and Kannada, finds the places and pins it on the map.</p>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; f && run(f); }}
        onClick={() => inp.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-saffron bg-saffron/10" : "border-line hover:border-muted"}`}>
        {preview ? <img src={preview} alt="" className="max-h-40 mx-auto rounded" /> : <div className="font-serif text-lg">Drop an image here<div className="text-xs text-muted font-sans mt-1">JPG, PNG or WebP · resized in your browser</div></div>}
        <input ref={inp} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; f && run(f); }} />
      </div>
      <div className="text-xs text-muted">Or try a sample from the archive:</div>
      <div className="flex flex-wrap gap-1.5">{SAMPLES.map((s) => <button key={s.url} disabled={stage >= 0 && stage < 5} onClick={async () => run(await fetch(s.url).then((r) => r.blob()))} className="text-xs px-2.5 py-1.5 rounded-lg border border-line hover:border-saffron disabled:opacity-40">{s.label}</button>)}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="…or paste journal text, e.g. a passage about the ghats of Benares" className="w-full rounded-lg bg-ink p-3 text-sm border border-line focus:border-saffron outline-none" />
      <button disabled={!text.trim() || (stage >= 0 && stage < 5)} onClick={() => { setPreview(null); run(null, text); }} className="w-full py-2 rounded-lg bg-saffron text-ink font-semibold text-sm disabled:opacity-40">Process text</button>
      {stage >= 0 && (
        <ol className="space-y-1.5 fade-in">
          {STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${i < stage ? "bg-teal text-ink" : i === stage ? "bg-saffron text-ink pulse" : "bg-ink3 text-muted"}`}>{i < stage ? "✓" : i + 1}</span>
              <span className={i <= stage ? "text-parch" : "text-muted"}>{s}</span>
            </li>
          ))}
          {stage === 5 && <li className="text-teal text-sm">Done. Opened on the map →</li>}
        </ol>
      )}
      {err && <p className="text-sm text-vermil">{err}</p>}
    </div>
  );
}

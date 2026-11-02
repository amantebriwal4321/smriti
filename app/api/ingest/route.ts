import { gemini } from "@/lib/gemini";
import { linkPlaces } from "@/lib/link";
import { monById } from "@/lib/data";

export const maxDuration = 120;

const PROMPT = `You are an archivist. The input is a heritage archive item from India: a scanned document (Hindi, Sanskrit, Devanagari, Kannada, Old Kannada, or other Indic script), a monument photo, or travel journal text.
Return JSON only with keys:
 kind ("scan" | "photo" | "journal"), title (short English), language, script, era (best guess),
 ocr_text (verbatim transcription of visible or given text in its original script, max 900 chars, [...] for unreadable),
 translation_en (max 900 chars), translation_hi (max 400 chars), translation_kn (max 400 chars),
 summary (2 sentences English), monument (most likely monument if any), city, state,
 places (list of places or monuments mentioned or shown), tags (5 short tags), confidence (0..1).
Never invent text that is not visible. Say when it is too worn to read.`;

async function geocode(q: string) {
  try {
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=" + encodeURIComponent(q), { headers: { "User-Agent": "smriti-hackcult/0.1" } });
    const d = await r.json();
    return d[0] ? { lat: +d[0].lat, lng: +d[0].lon, label: d[0].display_name, query: q } : null;
  } catch { return null; }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const text = (form.get("text") as string | null) || "";
  const parts: any[] = [{ text: PROMPT }];
  if (file && file.size) {
    if (file.size > 4_000_000) return Response.json({ error: "Image too large, keep it under 4 MB." }, { status: 413 });
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Response.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });
    parts.push({ inline_data: { mime_type: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") } });
  } else if (text.trim()) parts.push({ text: "TEXT:\n" + text.slice(0, 6000) });
  else return Response.json({ error: "Add an image or paste some text." }, { status: 400 });

  const t0 = Date.now();
  let ai;
  try { ai = await gemini(parts); } catch (e: any) { return Response.json({ error: e.message }, { status: 503 }); }
  const names = [...(ai.places || []), ai.monument, ai.city].filter(Boolean);
  const links = linkPlaces(names).map((l) => ({ ...l, name: monById.get(l.id)?.name, lat: monById.get(l.id)?.lat, lng: monById.get(l.id)?.lng }));
  let geo = null;
  if (!links.length) for (const q of names) { geo = await geocode(q); if (geo) break; }
  return Response.json({ ai, links, geo, ms: Date.now() - t0 });
}

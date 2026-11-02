"""Batch ingest: raw archive folder -> structured, geolinked JSON the app serves.

For each item: resize, OCR + translate (Gemini vision), extract places,
link to the monument gazetteer, attach coordinates. Idempotent: results are
cached by sha256 of the source file in data/.cache.
"""
import urllib.parse, base64, hashlib, io, json, os, re, sys, time, urllib.request
from difflib import SequenceMatcher
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "../hackcult"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PUB = os.path.join(ROOT, "public", "archive")
CACHE = os.path.join(ROOT, "data", ".cache")
MODELS = os.environ.get("GEMINI_MODELS", "gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-3.5-flash").split(",")
KEY = os.environ["GEMINI_API_KEY"]
os.makedirs(OUT_PUB, exist_ok=True); os.makedirs(CACHE, exist_ok=True)

PROMPT = {
 "scan": """You are an archivist reading a scanned heritage document (likely Hindi, Sanskrit in Devanagari, or Kannada / Old Kannada).
Return JSON only with keys:
 title (short English title), script, language, era (best guess, e.g. "c. 12th century CE" or "1920"),
 ocr_text (transcribe the visible text in original script, best effort, max 900 chars; mark unreadable parts with [...]),
 translation_en (faithful English translation of ocr_text, max 900 chars),
 translation_hi (Hindi translation, max 500 chars), translation_kn (Kannada translation, max 500 chars),
 summary (2 sentences in English on what this document is),
 places (list of place or monument names mentioned or strongly implied), confidence (0..1 for OCR quality).
Be honest when text is too worn to read.""",
 "photo": """You are an archivist cataloguing a heritage photograph from India.
Return JSON only with keys: title, monument (most likely monument name), city, state, era (construction period),
style (architectural style), summary (2 sentences English), summary_hi (Hindi), summary_kn (Kannada),
ocr_text (any visible inscription or signage text, else ""), places (list), tags (5 short tags), confidence (0..1).""",
 "journal": """You are an archivist reading a public-domain travel journal excerpt about India.
Return JSON only with keys: title, author_era (e.g. "1897"), summary (2 sentences English),
translation_hi (Hindi translation of the first 3 sentences), translation_kn (Kannada translation of the first 3 sentences),
places (list of monuments or places mentioned), tags (5 short tags), quotes (2 short memorable quotes verbatim from the text)."""}

def gemini(parts):
    body = json.dumps({"contents": [{"parts": parts}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}}).encode()
    for a in range(2 * len(MODELS)):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELS[a % len(MODELS)]}:generateContent"
        try:
            req = urllib.request.Request(url, body, {"content-type": "application/json", "x-goog-api-key": KEY})
            r = json.load(urllib.request.urlopen(req, timeout=120))
            t = r["candidates"][0]["content"]["parts"][0]["text"]
            j = json.loads(t)
            return j[0] if isinstance(j, list) else j
        except Exception as e:
            print("  retry", a, type(e).__name__, file=sys.stderr); time.sleep(2)
    raise RuntimeError("gemini failed")

def norm(s): return re.sub(r"[^a-z0-9 ]", " ", (s or "").lower()).strip()

mons = [json.loads(l) for l in open(os.path.join(SRC, "data", "monuments.jsonl"))]
def link(names, hint_id=None):
    out = {}
    if hint_id: out[hint_id] = 1.0
    for n in names or []:
        nn = norm(n)
        if len(nn) < 3: continue
        for m in mons:
            mn = norm(m["name"])
            s = 1.0 if (mn and (mn in nn or nn in mn) and min(len(mn), len(nn)) >= 5) else SequenceMatcher(None, nn, mn).ratio()
            if s >= 0.82 and s > out.get(m["id"], 0): out[m["id"]] = round(s, 2)
    return sorted(out.items(), key=lambda x: -x[1])[:4]

ALIASES = {"vijayanagar": "Q26732", "bisnaga": "Q26732", "vijayanagara": "Q26732", "hampi": "Q26732"}
GEO = os.path.join(CACHE, "geocode.json"); geo = json.load(open(GEO)) if os.path.exists(GEO) else {}
def geocode(q):
    if q not in geo:
        u = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=" + urllib.parse.quote(q)
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "smriti-hackcult/0.1"}), timeout=30))
            geo[q] = {"lat": float(r[0]["lat"]), "lng": float(r[0]["lon"]), "label": r[0]["display_name"]} if r else None
        except Exception: geo[q] = None
        time.sleep(1.1); json.dump(geo, open(GEO, "w"))
    return geo[q]

def slug(p): return re.sub(r"[^A-Za-z0-9]+", "_", os.path.basename(p).split("&")[0])[:60].strip("_")

items = []
manifest = [json.loads(l) for l in open(os.path.join(SRC, "sample_archive", "manifest.jsonl"))]
for i, it in enumerate(manifest):
    path = os.path.join(SRC, it["file"] if it["file"].startswith("sample_archive") else os.path.join("sample_archive", it["file"]))
    raw = open(path, "rb").read(); sha = hashlib.sha256(raw).hexdigest()[:16]
    cp = os.path.join(CACHE, sha + ".json")
    rec = {"id": sha, "kind": it["kind"], "source": it.get("source"), "author": it.get("author"), "license": it.get("license"), "orig_title": it.get("title")}
    if it["kind"] == "journal":
        rec["text"] = raw.decode("utf8", "ignore")[:4000]
        parts = [{"text": PROMPT["journal"] + "\n\nTEXT:\n" + rec["text"]}]
    else:
        im = Image.open(io.BytesIO(raw)).convert("RGB"); im.thumbnail((1400, 1400))
        name = f"{it['kind']}_{slug(path)}.jpg"; im.save(os.path.join(OUT_PUB, name), quality=82)
        rec["image"] = f"/archive/{name}"; rec["w"], rec["h"] = im.size
        b = io.BytesIO(); im.save(b, "JPEG", quality=85)
        parts = [{"text": PROMPT[it["kind"]]}, {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(b.getvalue()).decode()}}]
    if os.path.exists(cp):
        ai = json.load(open(cp)); ai = ai[0] if isinstance(ai, list) else ai
    else:
        print(f"[{i+1}/{len(manifest)}] {it['kind']} {os.path.basename(path)[:50]}"); ai = gemini(parts); json.dump(ai, open(cp, "w"), ensure_ascii=False)
    rec["ai"] = ai
    names = list(ai.get("places") or []) + [ai.get("monument") or "", it.get("monument") or ""]
    hint = it.get("monument_id") or next((v for k, v in ALIASES.items() if any(k in norm(n) for n in names + [ai.get("title") or ""])), None)
    rec["links"] = [{"id": k, "score": v} for k, v in link(names, hint)]
    if not rec["links"]:
        for q in [n for n in names if n] + [ai.get("city") or "", f"{ai.get('monument') or ''} {ai.get('state') or ''}".strip()]:
            g = q and geocode(q)
            if g: rec["geo"] = {**g, "query": q}; break
    items.append(rec)

used = {l["id"] for r in items for l in r["links"]}
slim = []
for m in mons:
    if not m.get("coords"): continue
    g = lambda k: (m.get(k) or {}).get("text", "") if isinstance(m.get(k), dict) else ""
    slim.append({"id": m["id"], "name": m["name"], "state": m.get("state"), "unesco": bool(m.get("unesco")),
                 "lat": m["coords"]["lat"], "lng": m["coords"]["lng"], "summary": g("summary")[:600],
                 "history": g("history")[:900], "architecture": g("architecture")[:600],
                 "wiki": m.get("sections_source"), "wikidata": m.get("wikidata")})
json.dump(slim, open(os.path.join(ROOT, "data", "monuments.json"), "w"), ensure_ascii=False)
json.dump(items, open(os.path.join(ROOT, "data", "archive.json"), "w"), ensure_ascii=False)
print(len(slim), "monuments,", len(items), "items,", len(used), "linked monuments")

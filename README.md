# Smriti (स्मृति)

**Turn unstructured heritage archives into a living, searchable map.**
Built for HackCult '26 (IIT Gandhinagar Blithchron x NxtWave), Track 2 Culture and Digital Heritage, problem HC26-CULT01.

Live: https://smriti-ebon-eight.vercel.app

Indian heritage sits in scattered archives: monument photos, Devanagari manuscripts, worn Old Kannada inscriptions, old travel journals. They are hard to read, not translated, not linked to places, and impossible to query. Smriti reads each item, translates it, figures out where it belongs, pins it on a map and lets you ask questions over the whole archive with citations.

## What it does

- **OCR + translation.** Scans in Devanagari (Hindi, Sanskrit, Braj) and Kannada / Old Kannada are transcribed in their original script and translated into English, Hindi and Kannada. Worn text is marked `[...]` instead of being made up, and every item carries a confidence score.
- **Geospatial linking.** Place and monument names are extracted, then linked to a gazetteer of 336 Indian monuments (Wikidata + Wikipedia) by fuzzy matching and aliases (Vijayanagar, Bisnaga, Hampi). Items with no gazetteer match are geocoded with OpenStreetMap Nominatim.
- **Map.** Leaflet + OpenStreetMap. Photos, scans and journals get their own colours, UNESCO sites are highlighted, items sharing a site are spread with a golden-angle layout.
- **Search.** BM25 over monuments and archive items, including original-script text.
- **Ask the archive.** Retrieval-augmented Q&A in English, हिन्दी or ಕನ್ನಡ. Non-English questions are rewritten to English keywords for retrieval, the answer is written in the chosen language, and each `[n]` citation opens the source on the map.
- **Add to archive.** Drop a photo or scan, or paste journal text. The live pipeline (upload, OCR, translate, extract places, link, map) runs in a few seconds and the item lands on the map.

## Architecture

```mermaid
flowchart LR
  subgraph Batch["Batch ingest (scripts/ingest.py)"]
    A[Raw archive<br/>photos, scans, journals<br/>+ manifest with licenses] --> B[Resize + sha256 cache]
    B --> C[Gemini vision<br/>OCR, translate en/hi/kn,<br/>places, era, tags]
    C --> D[Gazetteer linker<br/>fuzzy + aliases]
    D -->|no match| E[Nominatim geocode]
    D --> F[(archive.json)]
    E --> F
    G[(monuments.json<br/>336 sites, Wikidata)] --> D
  end
  subgraph App["Next.js on Vercel"]
    F --> H[BM25 index<br/>lib/search.ts]
    G --> H
    H --> I[/api/search]
    H --> J[/api/ask<br/>RAG + citations]
    K[/api/ingest<br/>live upload] --> C2[Gemini vision] --> D2[linker + geocode]
    I & J & D2 --> UI[Map-first UI<br/>Leaflet + OSM]
  end
```

Design notes:
- Stateless API routes, so they scale horizontally on Vercel functions.
- Batch ingest is idempotent: results are cached by the file's sha256, so re-runs only process new files.
- Gemini calls rotate across models, so one model's rate limit does not take the app down.
- The data layer is plain JSON today. The next step is Postgres + pgvector for embeddings and a queue for large batch uploads; the pipeline stages already map 1:1 to queue jobs.

## APIs and data used

| What | Used for |
|---|---|
| Google Gemini API (`gemini-3-flash-preview`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`) | OCR, translation, place extraction, cited answers |
| OpenStreetMap tiles + Nominatim | Map tiles and geocoding |
| Wikidata + Wikipedia (CC BY-SA 4.0) | Monument gazetteer: names, coordinates, history |
| Wikimedia Commons, Project Gutenberg | Seed archive items (licenses below) |

## Setup

```bash
git clone https://github.com/amantebriwal4321/smriti && cd smriti
npm install
echo "GEMINI_API_KEY=your_key" > .env.local
npm run dev            # http://localhost:3000

# optional: rebuild the archive from a raw folder
GEMINI_API_KEY=... python3 scripts/ingest.py /path/to/raw_archive
```

Raw archive layout: `data/monuments.jsonl` plus `sample_archive/manifest.jsonl` (one line per file with `file`, `kind`, `source`, `author`, `license`, optional `monument_id`).

## Seed archive and licenses

45 items: 30 monument photos and 10 document scans (5 Devanagari, 5 Kannada) from Wikimedia Commons, and 5 public-domain journal excerpts (Mark Twain, *Following the Equator*, 1897; Domingo Paes via Robert Sewell, *A Forgotten Empire*, 1900) from Project Gutenberg. Every item shows its author, license and source link in the app, and the full list is in `data/archive.json` (`source`, `author`, `license`). Licenses are CC0, public domain, CC BY-SA 3.0 and CC BY-SA 4.0.

## Known limits

- OCR on weathered Old Kannada stones is often partial; the app says so instead of guessing.
- A few manuscripts name no place and stay off the map.
- Ingest results from the live upload are kept in the browser session, not persisted.

## License

MIT

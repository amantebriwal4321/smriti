export type Monument = { id: string; name: string; state: string | null; unesco: boolean; lat: number; lng: number; summary: string; history: string; architecture: string; wiki: string | null; wikidata: string | null };
export type AI = Record<string, any>;
export type Item = { id: string; kind: "photo" | "scan" | "journal"; source?: string; author?: string; license?: string; orig_title?: string; image?: string; w?: number; h?: number; text?: string; ai: AI; links: { id: string; score: number }[]; geo?: { lat: number; lng: number; label: string; query: string } };
export type Doc = { key: string; type: "monument" | "item"; title: string; text: string; ref: string };

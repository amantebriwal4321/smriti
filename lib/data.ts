import monumentsRaw from "@/data/monuments.json";
import archiveRaw from "@/data/archive.json";
import type { Monument, Item, Doc } from "./types";

export const monuments = monumentsRaw as Monument[];
export const archive = archiveRaw as unknown as Item[];
export const monById = new Map(monuments.map((m) => [m.id, m]));

export function itemText(it: Item): string {
  const a = it.ai || {};
  return [a.title, a.summary, a.ocr_text, a.translation_en, a.monument, a.city, a.state, a.era, a.style, (a.places || []).join(", "), (a.tags || []).join(", "), (a.quotes || []).join(" "), it.text?.slice(0, 1500), it.orig_title].filter(Boolean).join("\n");
}

export const docs: Doc[] = [
  ...monuments.map((m) => ({ key: m.id, type: "monument" as const, title: m.name, ref: m.wiki || m.wikidata || "", text: [m.name, m.state, m.summary, m.history, m.architecture].filter(Boolean).join("\n") })),
  ...archive.map((it) => ({ key: it.id, type: "item" as const, title: it.ai?.title || it.orig_title || it.kind, ref: it.source || "", text: itemText(it) })),
];

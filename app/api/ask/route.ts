import { search } from "@/lib/search";
import { gemini } from "@/lib/gemini";

const LANG: Record<string, string> = { en: "English", hi: "Hindi", kn: "Kannada" };

export async function POST(req: Request) {
  const { question, lang = "en" } = await req.json();
  if (!question || typeof question !== "string" || question.length > 500) return Response.json({ error: "Ask a question under 500 characters." }, { status: 400 });
  // Multilingual retrieval: questions in Hindi or Kannada are first rewritten to English keywords.
  let query = question;
  if (/[^\x00-\x7F]/.test(question)) {
    try { const r = await gemini([{ text: `Rewrite this question as English search keywords (monument names, places, topics). Return JSON {"q": "..."}.\n${question}` }]); query = r.q || question; } catch {}
  }
  const hits = search(query, 6);
  if (!hits.length) return Response.json({ answer: "I could not find anything in the archive about that.", sources: [] });
  const ctx = hits.map((h, i) => `[${i + 1}] ${h.title} (${h.type})\n${h.text.slice(0, 1400)}`).join("\n\n");
  try {
    const r = await gemini([{ text: `You answer questions about an Indian heritage archive using ONLY the sources below. Cite sources inline like [1]. If the sources do not contain the answer, say so plainly. Answer in ${LANG[lang] || "English"}, in at most 120 words.\nReturn JSON {"answer": "...", "used": [source numbers]}.\n\nSOURCES:\n${ctx}\n\nQUESTION: ${question}` }]);
    return Response.json({ answer: r.answer, used: r.used || [], model: r._model, sources: hits.map(({ text, ...h }) => h) });
  } catch (e: any) {
    return Response.json({ error: e.message, sources: hits.map(({ text, ...h }) => h) }, { status: 503 });
  }
}

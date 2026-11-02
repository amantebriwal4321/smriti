// Thin Gemini client. Rotates through models so one model's rate limit does not take the app down.
const MODELS = (process.env.GEMINI_MODELS || "gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.1-flash-lite-preview,gemini-3.5-flash,gemma-4-26b-a4b-it").split(",");

export async function gemini(parts: any[], json = true): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  let last = "";
  for (const model of MODELS) {
    let r: Response;
    try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: "application/json" } : {}) } }),
      signal: AbortSignal.timeout(20000),
    }); } catch { last = `${model}: timeout`; continue; }
    if (!r.ok) { last = `${model}: ${r.status}`; continue; }
    const d = await r.json();
    const t = (d?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("").replace(/^```(json)?|```$/gm, "").trim();
    if (!json) return { text: t, model };
    try { const j = JSON.parse(t); return { ...(Array.isArray(j) ? j[0] : j), _model: model }; } catch { last = `${model}: bad json`; }
  }
  throw new Error("All models busy (" + last + "). Try again in a minute.");
}

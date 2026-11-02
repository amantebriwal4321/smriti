import { search } from "@/lib/search";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  return Response.json({ q, results: q.trim() ? search(q, 20).map(({ text, ...d }) => ({ ...d, snippet: text.slice(0, 220) })) : [] });
}

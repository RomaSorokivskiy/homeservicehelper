import { NextRequest, NextResponse } from "next/server";

async function get(url: string, token: string | undefined, header = "Authorization") {
  if (!token) return null;
  const response = await fetch(url, { headers: { [header]: header === "Authorization" ? `Bearer ${token}` : token }, signal: AbortSignal.timeout(5000), cache: "no-store" });
  return response.ok ? response.json() : null;
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ results: [] });
  const q = encodeURIComponent(query);
  const homebox = process.env.HOMEBOX_URL || "http://homebox:7745/api";
  const vikunja = process.env.VIKUNJA_URL || "http://vikunja:3456/api/v1";
  const jellyfin = process.env.JELLYFIN_URL || "http://jellyfin:8096";
  const [things, tasks, media] = await Promise.all([
    get(`${homebox}/v1/entities?page=1&pageSize=8&q=${q}`, process.env.HOMEBOX_TOKEN).catch(() => null),
    get(`${vikunja}/tasks?s=${q}&per_page=8`, process.env.VIKUNJA_TOKEN).catch(() => null),
    get(`${jellyfin}/Items?SearchTerm=${q}&Limit=8&Recursive=true&IncludeItemTypes=Movie,Series`, process.env.JELLYFIN_TOKEN, "X-Emby-Token").catch(() => null),
  ]);
  const thingItems = (Array.isArray(things) ? things : things?.items || []) as Record<string, unknown>[];
  const taskItems = (Array.isArray(tasks) ? tasks : []) as Record<string, unknown>[];
  const mediaItems = (media?.Items || []) as Record<string, unknown>[];
  return NextResponse.json({ results: [
    ...thingItems.map((x) => ({ id: `thing-${x.id}`, type: "Річ", title: x.name, href: `https://things.home.arpa` })),
    ...taskItems.map((x) => ({ id: `task-${x.id}`, type: "Справа", title: x.title, href: `https://tasks.home.arpa/tasks/${x.id}` })),
    ...mediaItems.map((x) => ({ id: `media-${x.Id}`, type: "Кіно", title: x.Name, href: `https://cinema.home.arpa/web/#/details?id=${x.Id}` })),
  ] });
}

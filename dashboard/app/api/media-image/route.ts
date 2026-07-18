import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  const token = process.env.JELLYFIN_TOKEN;
  if (!token) return NextResponse.json({ error: "Cinema is not configured" }, { status: 404 });
  const base = process.env.JELLYFIN_URL || "http://jellyfin:8096";
  const response = await fetch(`${base}/Items/${id}/Images/Primary?maxWidth=600&quality=85`, { headers: { "X-Emby-Token": token }, signal: AbortSignal.timeout(8000) });
  if (!response.ok || !response.body) return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}

import { NextRequest, NextResponse } from "next/server";

const urls = { mealie: process.env.MEALIE_URL || "http://mealie:9000", vikunja: process.env.VIKUNJA_URL || "http://vikunja:3456/api/v1", homebox: process.env.HOMEBOX_URL || "http://homebox:7745/api" };

async function call(url: string, token: string | undefined, method: string, body: unknown) {
  if (!token) throw new Error("Сервіс ще не підключено");
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Сервіс відповів ${response.status}`);
  return response.status === 204 ? {} : response.json();
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    let result;
    if (data.action === "task.create") result = await call(`${urls.vikunja}/projects/${process.env.VIKUNJA_PROJECT_ID}/tasks`, process.env.VIKUNJA_TOKEN, "PUT", { title: data.title });
    else if (data.action === "task.toggle") result = await call(`${urls.vikunja}/tasks/${data.id}`, process.env.VIKUNJA_TOKEN, "POST", { done: data.done });
    else if (data.action === "shopping.create") result = await call(`${urls.mealie}/api/households/shopping/items`, process.env.MEALIE_TOKEN, "POST", { shoppingListId: process.env.MEALIE_SHOPPING_LIST_ID, note: data.title, display: data.title, quantity: 1 });
    else if (data.action === "thing.create") result = await call(`${urls.homebox}/v1/entities`, process.env.HOMEBOX_TOKEN, "POST", { name: data.title, quantity: 1 });
    else return NextResponse.json({ error: "Невідома дія" }, { status: 400 });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося виконати дію" }, { status: 502 });
  }
}

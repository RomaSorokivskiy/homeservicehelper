import { NextRequest, NextResponse } from "next/server";

const urls = { mealie: process.env.MEALIE_URL || "http://mealie:9000", vikunja: process.env.VIKUNJA_URL || "http://vikunja:3456/api/v1", homebox: process.env.HOMEBOX_URL || "http://homebox:7745/api", homeAssistant: process.env.HOME_ASSISTANT_URL || "http://home-assistant:8123", jellyfin: process.env.JELLYFIN_URL || "http://jellyfin:8096", state: process.env.HOUSEHOLD_STATE_URL || "http://household-state:8787" };

async function call(url: string, token: string | undefined, method: string, body: unknown) {
  if (!token) throw new Error("Сервіс ще не підключено");
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Сервіс відповів ${response.status}`);
  return response.status === 204 ? {} : response.json();
}

async function jellyfinCall(path: string, method: string, body?: unknown) {
  const token = process.env.JELLYFIN_TOKEN;
  if (!token) throw new Error("Кінотеатр ще не підключено");
  const response = await fetch(`${urls.jellyfin}${path}`, { method, headers: { "X-Emby-Token": token, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Jellyfin відповів ${response.status}`);
  return response.status === 204 ? {} : response.json();
}

async function stateCall(path: string, method: string, body?: unknown) {
  const response = await fetch(`${urls.state}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Спільний стан відповів ${response.status}`);
  return response.json();
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let actionName = "unknown";
  try {
    const data = await request.json();
    actionName = typeof data.action === "string" ? data.action : "unknown";
    let result;
    if (data.action === "task.create") result = await call(`${urls.vikunja}/projects/${process.env.VIKUNJA_PROJECT_ID}/tasks`, process.env.VIKUNJA_TOKEN, "PUT", { title: data.title });
    else if (data.action === "task.toggle") result = await call(`${urls.vikunja}/tasks/${data.id}`, process.env.VIKUNJA_TOKEN, "POST", { done: data.done });
    else if (data.action === "task.postpone" && Number.isInteger(data.id)) { const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(18, 0, 0, 0); result = await call(`${urls.vikunja}/tasks/${data.id}`, process.env.VIKUNJA_TOKEN, "POST", { due_date: tomorrow.toISOString() }); }
    else if (data.action === "shopping.create") result = await call(`${urls.mealie}/api/households/shopping/items`, process.env.MEALIE_TOKEN, "POST", { shoppingListId: process.env.MEALIE_SHOPPING_LIST_ID, note: data.title, display: data.title, quantity: 1 });
    else if (data.action === "meal.create") result = await call(`${urls.mealie}/api/households/mealplans`, process.env.MEALIE_TOKEN, "POST", { date: new Date().toISOString().slice(0, 10), entryType: "dinner", title: String(data.title || ""), text: "" });
    else if (data.action === "shopping.toggle" && typeof data.id === "string" && typeof data.shoppingListId === "string") result = await call(`${urls.mealie}/api/households/shopping/items/${data.id}`, process.env.MEALIE_TOKEN, "PUT", { checked: Boolean(data.checked), shoppingListId: data.shoppingListId, display: String(data.title || ""), note: String(data.title || ""), quantity: 1 });
    else if (data.action === "thing.create") result = await call(`${urls.homebox}/v1/entities`, process.env.HOMEBOX_TOKEN, "POST", { name: data.title, quantity: 1 });
    else if (data.action === "scene.activate" && typeof data.entityId === "string" && /^scene\.[a-z0-9_]+$/.test(data.entityId)) result = await call(`${urls.homeAssistant}/api/services/scene/turn_on`, process.env.HOME_ASSISTANT_TOKEN, "POST", { entity_id: data.entityId });
    else if (data.action === "cinema.play" && /^[a-zA-Z0-9-]+$/.test(data.itemId) && /^[a-zA-Z0-9-]+$/.test(data.sessionId)) result = await jellyfinCall(`/Sessions/${data.sessionId}/Playing`, "POST", { ItemIds: [data.itemId], PlayCommand: "PlayNow", StartPositionTicks: 0 });
    else if (data.action === "cinema.control" && /^[a-zA-Z0-9-]+$/.test(data.sessionId) && ["PlayPause","Stop","NextTrack","PreviousTrack"].includes(data.command)) result = await jellyfinCall(`/Sessions/${data.sessionId}/Playing/${data.command}`, "POST");
    else if (data.action === "resident.create") result = await stateCall("/residents", "POST", { name: String(data.title || "") });
    else if (data.action === "queue.add" && /^[a-zA-Z0-9-]+$/.test(data.item?.id)) result = await stateCall("/queue", "POST", { ...data.item, residentId: Number(data.residentId) || null });
    else if (data.action === "queue.remove" && /^[a-zA-Z0-9-]+$/.test(data.itemId)) result = await stateCall(`/queue/${data.itemId}`, "DELETE");
    else if (data.action === "queue.vote" && /^[a-zA-Z0-9-]+$/.test(data.itemId) && Number.isInteger(data.residentId) && [-1,1].includes(data.value)) result = await stateCall("/votes", "POST", { mediaId: data.itemId, residentId: data.residentId, value: data.value });
    else return NextResponse.json({ error: "Невідома дія" }, { status: 400 });
    const durationMs = Date.now() - startedAt;
    console.info(JSON.stringify({ event: "household_action", action: actionName, ok: true, durationMs, at: new Date().toISOString() }));
    await stateCall("/audit", "POST", { action: actionName, ok: true, durationMs, actorId: null }).catch(() => null);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.warn(JSON.stringify({ event: "household_action", action: actionName, ok: false, durationMs, at: new Date().toISOString() }));
    await stateCall("/audit", "POST", { action: actionName, ok: false, durationMs, actorId: null }).catch(() => null);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося виконати дію" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const urls = { mealie: process.env.MEALIE_URL || "http://mealie:9000", vikunja: process.env.VIKUNJA_URL || "http://vikunja:3456/api/v1", homebox: process.env.HOMEBOX_URL || "http://homebox:7745/api", homeAssistant: process.env.HOME_ASSISTANT_URL || "http://home-assistant:8123", jellyfin: process.env.JELLYFIN_URL || "http://jellyfin:8096", state: process.env.HOUSEHOLD_STATE_URL || "http://household-state:8787" };

async function call(url: string, token: string | undefined, method: string, body: unknown) {
  if (!token) throw new Error("Сервіс ще не підключено");
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Сервіс відповів ${response.status}`);
  return response.status === 204 ? {} : response.json();
}

async function read(url: string, token: string | undefined) {
  if (!token) throw new Error("Сервіс ще не підключено");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Сервіс відповів ${response.status}`);
  return response.json();
}

async function upsertDinner(title?: string, servings?: number) {
  const token = process.env.MEALIE_TOKEN;
  const value = await read(`${urls.mealie}/api/households/mealplans/today`, token);
  const entries = Array.isArray(value) ? value : value?.items || [];
  const current = entries.find((item: Record<string, unknown>) => item.entryType === "dinner") || entries[0];
  const date = new Date().toISOString().slice(0, 10);
  const text = servings ? `Порції: ${Math.max(1,Math.min(20,servings))}` : String(current?.text || "");
  if (current?.id) return call(`${urls.mealie}/api/households/mealplans/${current.id}`, token, "PUT", { ...current, date: current.date || date, title: title?.trim() || current.title || "Вечеря", text });
  return call(`${urls.mealie}/api/households/mealplans`, token, "POST", { date, entryType: "dinner", title: title?.trim() || "Вечеря", text });
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
  const actorName = request.headers.get("x-household-user") || "internal-check";
  let actionName = "unknown";
  try {
    const data = await request.json();
    actionName = typeof data.action === "string" ? data.action : "unknown";
    let result;
    if (data.action === "task.create") result = await call(`${urls.vikunja}/projects/${process.env.VIKUNJA_PROJECT_ID}/tasks`, process.env.VIKUNJA_TOKEN, "PUT", { title: String(data.title||"").trim().slice(0,240), due_date: /^\d{4}-\d{2}-\d{2}$/.test(String(data.due||"")) ? `${data.due}T18:00:00Z` : undefined, repeat_after: Math.max(0,Math.min(365,Number(data.repeatDays)||0))*86400, repeat_mode: 0 });
    else if (data.action === "task.toggle") result = await call(`${urls.vikunja}/tasks/${data.id}`, process.env.VIKUNJA_TOKEN, "POST", { done: data.done });
    else if (data.action === "task.rename" && Number.isInteger(data.id) && typeof data.title === "string" && data.title.trim().length > 1) result = await call(`${urls.vikunja}/tasks/${data.id}`, process.env.VIKUNJA_TOKEN, "POST", { title: data.title.trim().slice(0, 240) });
    else if (data.action === "task.delete" && Number.isInteger(data.id)) result = await call(`${urls.vikunja}/tasks/${data.id}`, process.env.VIKUNJA_TOKEN, "DELETE", {});
    else if (data.action === "task.postpone" && Number.isInteger(data.id)) { const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(18, 0, 0, 0); result = await call(`${urls.vikunja}/tasks/${data.id}`, process.env.VIKUNJA_TOKEN, "POST", { due_date: tomorrow.toISOString() }); }
    else if (data.action === "shopping.create") result = await call(`${urls.mealie}/api/households/shopping/items`, process.env.MEALIE_TOKEN, "POST", { shoppingListId: process.env.MEALIE_SHOPPING_LIST_ID, note: data.title, display: data.title, quantity: 1 });
    else if (data.action === "meal.create" && typeof data.title === "string" && data.title.trim()) result = await upsertDinner(data.title);
    else if (data.action === "meal.servings" && Number.isInteger(data.servings)) result = await upsertDinner(undefined, data.servings);
    else if (data.action === "meal.delete" && Number.isInteger(data.id)) result = await call(`${urls.mealie}/api/households/mealplans/${data.id}`, process.env.MEALIE_TOKEN, "DELETE", {});
    else if (data.action === "meal.ingredients" && typeof data.recipeId === "string" && /^[0-9a-f-]{36}$/i.test(data.recipeId)) result = await call(`${urls.mealie}/api/households/shopping/lists/${process.env.MEALIE_SHOPPING_LIST_ID}/recipe/${data.recipeId}`, process.env.MEALIE_TOKEN, "POST", { recipeIncrementQuantity: Math.max(1,Number(data.servings)||1) });
    else if (data.action === "shopping.toggle" && typeof data.id === "string" && typeof data.shoppingListId === "string") result = await call(`${urls.mealie}/api/households/shopping/items/${data.id}`, process.env.MEALIE_TOKEN, "PUT", { checked: Boolean(data.checked), shoppingListId: data.shoppingListId, display: String(data.title || ""), note: String(data.title || ""), quantity: 1 });
    else if (data.action === "shopping.rename" && typeof data.id === "string" && typeof data.shoppingListId === "string" && typeof data.title === "string" && data.title.trim().length > 1) result = await call(`${urls.mealie}/api/households/shopping/items/${data.id}`, process.env.MEALIE_TOKEN, "PUT", { checked: Boolean(data.checked), shoppingListId: data.shoppingListId, display: data.title.trim().slice(0, 160), note: data.title.trim().slice(0, 160), quantity: Number(data.quantity) || 1 });
    else if (data.action === "shopping.delete" && typeof data.id === "string") result = await call(`${urls.mealie}/api/households/shopping/items/${data.id}`, process.env.MEALIE_TOKEN, "DELETE", {});
    else if (data.action === "thing.create" && typeof data.title === "string" && data.title.trim()) {
      const created = await call(`${urls.homebox}/v1/entities`, process.env.HOMEBOX_TOKEN, "POST", { name: data.title.trim().slice(0,255), quantity: Math.max(1,Number(data.quantity)||1), description: String(data.description||"").slice(0,1000) });
      const details = { serialNumber: String(data.serialNumber||"").slice(0,255), warrantyExpires: /^\d{4}-\d{2}-\d{2}$/.test(String(data.warrantyExpires||"")) ? data.warrantyExpires : "" };
      result = (details.serialNumber || details.warrantyExpires) && created?.id ? await call(`${urls.homebox}/v1/entities/${created.id}`, process.env.HOMEBOX_TOKEN, "PUT", { ...created, ...details }) : created;
    }
    else if (data.action === "thing.update" && typeof data.id === "string" && typeof data.title === "string" && data.title.trim().length > 0) result = await call(`${urls.homebox}/v1/entities/${data.id}`, process.env.HOMEBOX_TOKEN, "PUT", { id: data.id, name: data.title.trim().slice(0,255), quantity: Math.max(1,Number(data.quantity)||1), description: String(data.description||"").slice(0,1000) });
    else if (data.action === "thing.delete" && typeof data.id === "string") result = await call(`${urls.homebox}/v1/entities/${data.id}`, process.env.HOMEBOX_TOKEN, "DELETE", {});
    else if (data.action === "scene.activate" && typeof data.entityId === "string" && /^scene\.[a-z0-9_]+$/.test(data.entityId)) result = await call(`${urls.homeAssistant}/api/services/scene/turn_on`, process.env.HOME_ASSISTANT_TOKEN, "POST", { entity_id: data.entityId });
    else if (data.action === "home.set" && typeof data.entityId === "string" && /^(light|switch)\.[a-z0-9_]+$/.test(data.entityId) && typeof data.on === "boolean") { const domain = data.entityId.split(".")[0]; result = await call(`${urls.homeAssistant}/api/services/${domain}/${data.on ? "turn_on" : "turn_off"}`, process.env.HOME_ASSISTANT_TOKEN, "POST", { entity_id: data.entityId }); }
    else if (data.action === "cinema.play" && /^[a-zA-Z0-9-]+$/.test(data.itemId) && /^[a-zA-Z0-9-]+$/.test(data.sessionId)) result = await jellyfinCall(`/Sessions/${data.sessionId}/Playing`, "POST", { ItemIds: [data.itemId], PlayCommand: "PlayNow", StartPositionTicks: 0 });
    else if (data.action === "cinema.control" && /^[a-zA-Z0-9-]+$/.test(data.sessionId) && ["PlayPause","Stop","NextTrack","PreviousTrack"].includes(data.command)) result = await jellyfinCall(`/Sessions/${data.sessionId}/Playing/${data.command}`, "POST");
    else if (data.action === "cinema.seek" && /^[a-zA-Z0-9-]+$/.test(data.sessionId) && Number.isSafeInteger(data.positionTicks) && data.positionTicks >= 0) result = await jellyfinCall(`/Sessions/${data.sessionId}/Playing/Seek?SeekPositionTicks=${Math.min(data.positionTicks, 864000000000)}`, "POST");
    else if (data.action === "cinema.volume" && /^[a-zA-Z0-9-]+$/.test(data.sessionId) && Number.isInteger(data.volume) && data.volume >= 0 && data.volume <= 100) result = await jellyfinCall(`/Sessions/${data.sessionId}/Command`, "POST", { Name: "SetVolume", Arguments: { Volume: String(data.volume) } });
    else if (data.action === "movie-night.start" && /^[a-zA-Z0-9-]+$/.test(data.itemId) && /^[a-zA-Z0-9-]+$/.test(data.sessionId)) {
      const scene = process.env.HA_MOVIE_SCENE;
      const sceneResult = scene && /^scene\.[a-z0-9_]+$/.test(scene) ? await call(`${urls.homeAssistant}/api/services/scene/turn_on`, process.env.HOME_ASSISTANT_TOKEN, "POST", { entity_id: scene }) : { skipped: true, reason: "HA_MOVIE_SCENE is not configured" };
      const playback = await jellyfinCall(`/Sessions/${data.sessionId}/Playing`, "POST", { ItemIds: [data.itemId], PlayCommand: "PlayNow", StartPositionTicks: 0 });
      result = { scene: sceneResult, playback };
    }
    else if (data.action === "resident.create") result = await stateCall("/residents", "POST", { name: String(data.title || "") });
    else if (data.action === "queue.add" && /^[a-zA-Z0-9-]+$/.test(data.item?.id)) result = await stateCall("/queue", "POST", { ...data.item, residentId: Number(data.residentId) || null });
    else if (data.action === "queue.remove" && /^[a-zA-Z0-9-]+$/.test(data.itemId)) result = await stateCall(`/queue/${data.itemId}`, "DELETE");
    else if (data.action === "queue.vote" && /^[a-zA-Z0-9-]+$/.test(data.itemId) && Number.isInteger(data.residentId) && [-1,1].includes(data.value)) result = await stateCall("/votes", "POST", { mediaId: data.itemId, residentId: data.residentId, value: data.value });
    else if (data.action === "task.assign" && Number.isInteger(data.id) && Number.isInteger(data.residentId)) result = await stateCall("/task-assignments", "POST", { taskId: data.id, residentId: data.residentId });
    else if (data.action === "task.unassign" && Number.isInteger(data.id)) result = await stateCall(`/task-assignments/${data.id}`, "DELETE");
    else return NextResponse.json({ error: "Невідома дія" }, { status: 400 });
    const durationMs = Date.now() - startedAt;
    console.info(JSON.stringify({ event: "household_action", action: actionName, ok: true, durationMs, at: new Date().toISOString() }));
    await stateCall("/audit", "POST", { action: actionName, ok: true, durationMs, actorName }).catch(() => null);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.warn(JSON.stringify({ event: "household_action", action: actionName, ok: false, durationMs, at: new Date().toISOString() }));
    await stateCall("/audit", "POST", { action: actionName, ok: false, durationMs, actorName }).catch(() => null);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося виконати дію" }, { status: 502 });
  }
}

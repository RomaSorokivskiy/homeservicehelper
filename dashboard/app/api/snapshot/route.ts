import { NextResponse } from "next/server";

const config = {
  mealie: process.env.MEALIE_URL || "http://mealie:9000",
  vikunja: process.env.VIKUNJA_URL || "http://vikunja:3456/api/v1",
  homebox: process.env.HOMEBOX_URL || "http://homebox:7745/api",
  mealieToken: process.env.MEALIE_TOKEN,
  vikunjaToken: process.env.VIKUNJA_TOKEN,
  homeboxToken: process.env.HOMEBOX_TOKEN,
};

async function readJson(url: string, token?: string) {
  if (!token) return null;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

export async function GET() {
  const states: Record<string, boolean> = {};
  const [tasks, shopping, meals, things] = await Promise.all([
    readJson(`${config.vikunja}/tasks?per_page=8&sort_by=due_date&order_by=asc`, config.vikunjaToken).then((v) => (states.vikunja = true, v)).catch(() => (states.vikunja = false, null)),
    readJson(`${config.mealie}/api/households/shopping/items?perPage=12`, config.mealieToken).then((v) => (states.mealie = true, v)).catch(() => (states.mealie = false, null)),
    readJson(`${config.mealie}/api/households/mealplans/today`, config.mealieToken).catch(() => null),
    readJson(`${config.homebox}/v1/entities?page=1&pageSize=6`, config.homeboxToken).then((v) => (states.homebox = true, v)).catch(() => (states.homebox = false, null)),
  ]);

  const meal = Array.isArray(meals) ? meals[0] : meals?.items?.[0] || meals?.[0];
  const taskItems = Array.isArray(tasks) ? tasks as Record<string, unknown>[] : [];
  const shoppingItems = (Array.isArray(shopping) ? shopping : shopping?.items || []) as Record<string, unknown>[];
  const thingItems = (Array.isArray(things) ? things : things?.items || []) as Record<string, unknown>[];
  const mealItem = (meal || null) as Record<string, unknown> | null;
  const tokenConfigured: Record<string, boolean> = { mealie: Boolean(config.mealieToken), vikunja: Boolean(config.vikunjaToken), homebox: Boolean(config.homeboxToken) };
  return NextResponse.json({
    connected: { mealie: Boolean(config.mealieToken), vikunja: Boolean(config.vikunjaToken), homebox: Boolean(config.homeboxToken) },
    tasks: taskItems.map((item) => ({ id: item.id, title: item.title, done: item.done, due: item.due_date || null, projectId: item.project_id })),
    shopping: shoppingItems.map((item) => { const food = item.food as Record<string, unknown> | undefined; return { id: item.id, title: item.display || food?.name || item.note || "Покупка", checked: item.checked, shoppingListId: item.shoppingListId }; }),
    meal: mealItem ? { title: mealItem.title || "Запланована страва", note: mealItem.description || "У плані на сьогодні" } : null,
    things: thingItems.map((item) => { const entityType = item.entityType as Record<string, unknown> | undefined; return { id: item.id, name: item.name, quantity: item.quantity || 1, type: entityType?.name || "Річ" }; }),
    services: ["mealie", "vikunja", "homebox"].map((name) => ({ name, connected: tokenConfigured[name], ok: states[name] ?? false })),
    generatedAt: new Date().toISOString(),
  });
}

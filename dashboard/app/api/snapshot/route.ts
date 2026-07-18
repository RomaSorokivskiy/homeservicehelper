import { NextResponse } from "next/server";

const config = {
  mealie: process.env.MEALIE_URL || "http://mealie:9000",
  vikunja: process.env.VIKUNJA_URL || "http://vikunja:3456/api/v1",
  homebox: process.env.HOMEBOX_URL || "http://homebox:7745/api",
  jellyfin: process.env.JELLYFIN_URL || "http://jellyfin:8096",
  homeAssistant: process.env.HOME_ASSISTANT_URL || "http://home-assistant:8123",
  mealieToken: process.env.MEALIE_TOKEN,
  vikunjaToken: process.env.VIKUNJA_TOKEN,
  homeboxToken: process.env.HOMEBOX_TOKEN,
  jellyfinToken: process.env.JELLYFIN_TOKEN,
  homeAssistantToken: process.env.HOME_ASSISTANT_TOKEN,
};

async function readJson(url: string, token?: string) {
  if (!token) return null;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

async function readJellyfin(url: string) {
  if (!config.jellyfinToken) return null;
  const response = await fetch(url, { headers: { "X-Emby-Token": config.jellyfinToken, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

export async function GET() {
  const states: Record<string, boolean> = {};
  const [tasks, shopping, meals, things, jellyfinPublic, homeStates] = await Promise.all([
    readJson(`${config.vikunja}/tasks?per_page=30&sort_by=due_date&order_by=asc`, config.vikunjaToken).then((v) => (states.vikunja = true, v)).catch(() => (states.vikunja = false, null)),
    readJson(`${config.mealie}/api/households/shopping/items?perPage=12`, config.mealieToken).then((v) => (states.mealie = true, v)).catch(() => (states.mealie = false, null)),
    readJson(`${config.mealie}/api/households/mealplans/today`, config.mealieToken).catch(() => null),
    readJson(`${config.homebox}/v1/entities?page=1&pageSize=6`, config.homeboxToken).then((v) => (states.homebox = true, v)).catch(() => (states.homebox = false, null)),
    fetch(`${config.jellyfin}/System/Info/Public`, { signal: AbortSignal.timeout(5000) }).then((r) => { states.jellyfin = r.ok; return r.ok ? r.json() : null; }).catch(() => (states.jellyfin = false, null)),
    readJson(`${config.homeAssistant}/api/states`, config.homeAssistantToken).then((v) => (states.homeAssistant = true, v)).catch(() => (states.homeAssistant = false, null)),
  ]);

  let cinema: Record<string, unknown> = { configured: Boolean(config.jellyfinToken), serverName: jellyfinPublic?.ServerName || "Jellyfin", resume: [], latest: [], sessions: [] };
  if (config.jellyfinToken && states.jellyfin) {
    try {
      const users = await readJellyfin(`${config.jellyfin}/Users`) as Record<string, unknown>[];
      const userId = users?.[0]?.Id;
      if (userId) {
        const [resume, latest] = await Promise.all([
          readJellyfin(`${config.jellyfin}/Users/${userId}/Items/Resume?Limit=12&Fields=Overview,PrimaryImageAspectRatio`),
          readJellyfin(`${config.jellyfin}/Users/${userId}/Items/Latest?Limit=12&IncludeItemTypes=Movie,Series&Fields=Overview,PrimaryImageAspectRatio`),
        ]);
        const normalizeMedia = (value: unknown) => ((value as { Items?: Record<string, unknown>[] })?.Items || (Array.isArray(value) ? value : [])).map((item) => ({ id: item.Id, title: item.Name, type: item.Type, overview: item.Overview || "", year: item.ProductionYear || null, image: item.ImageTags ? `/api/media-image?id=${item.Id}` : null, progress: (item.UserData as Record<string, unknown> | undefined)?.PlayedPercentage || 0 }));
        const sessions = await readJellyfin(`${config.jellyfin}/Sessions`) as Record<string, unknown>[];
        cinema = { ...cinema, userId, resume: normalizeMedia(resume), latest: normalizeMedia(latest), sessions: (sessions || []).filter((x) => x.SupportsRemoteControl).map((x) => ({ id: x.Id, name: x.DeviceName || x.Client, client: x.Client, nowPlaying: (x.NowPlayingItem as Record<string, unknown> | undefined)?.Name || null, paused: (x.PlayState as Record<string, unknown> | undefined)?.IsPaused || false })) };
      }
    } catch { /* Public health remains useful until the administrator creates a token. */ }
  }
  const haItems = (Array.isArray(homeStates) ? homeStates : []) as Record<string, unknown>[];
  const home = {
    configured: Boolean(config.homeAssistantToken),
    scenes: haItems.filter((x) => String(x.entity_id).startsWith("scene.")).map((x) => ({ id: x.entity_id, name: (x.attributes as Record<string, unknown> | undefined)?.friendly_name || x.entity_id })),
    alerts: haItems.filter((x) => /^(binary_sensor\.).*(leak|smoke|door)/.test(String(x.entity_id)) && x.state === "on").map((x) => ({ id: x.entity_id, name: (x.attributes as Record<string, unknown> | undefined)?.friendly_name || x.entity_id })),
    lightsOn: haItems.filter((x) => String(x.entity_id).startsWith("light.") && x.state === "on").length,
    entities: haItems.length,
  };

  const meal = Array.isArray(meals) ? meals[0] : meals?.items?.[0] || meals?.[0];
  const taskItems = Array.isArray(tasks) ? tasks as Record<string, unknown>[] : [];
  const shoppingItems = (Array.isArray(shopping) ? shopping : shopping?.items || []) as Record<string, unknown>[];
  const thingItems = (Array.isArray(things) ? things : things?.items || []) as Record<string, unknown>[];
  const mealItem = (meal || null) as Record<string, unknown> | null;
  const tokenConfigured: Record<string, boolean> = { mealie: Boolean(config.mealieToken), vikunja: Boolean(config.vikunjaToken), homebox: Boolean(config.homeboxToken), jellyfin: Boolean(config.jellyfinToken), homeAssistant: Boolean(config.homeAssistantToken) };
  return NextResponse.json({
    connected: { mealie: Boolean(config.mealieToken), vikunja: Boolean(config.vikunjaToken), homebox: Boolean(config.homeboxToken) },
    tasks: taskItems.map((item) => ({ id: item.id, title: item.title, done: item.done, due: item.due_date || null, projectId: item.project_id })),
    shopping: shoppingItems.map((item) => { const food = item.food as Record<string, unknown> | undefined; return { id: item.id, title: item.display || food?.name || item.note || "Покупка", checked: item.checked, shoppingListId: item.shoppingListId }; }),
    meal: mealItem ? { title: mealItem.title || "Запланована страва", note: mealItem.description || "У плані на сьогодні" } : null,
    things: thingItems.map((item) => { const entityType = item.entityType as Record<string, unknown> | undefined; return { id: item.id, name: item.name, quantity: item.quantity || 1, type: entityType?.name || "Річ" }; }),
    cinema,
    home,
    services: ["mealie", "vikunja", "homebox", "jellyfin", "homeAssistant"].map((name) => ({ name, connected: tokenConfigured[name], ok: states[name] ?? false })),
    generatedAt: new Date().toISOString(),
  });
}

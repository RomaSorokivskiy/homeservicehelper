const base = "http://dashboard:3000";
const snapshotResponse = await fetch(`${base}/api/snapshot`);
if (!snapshotResponse.ok) throw new Error(`Snapshot failed: ${snapshotResponse.status}`);
const snapshot = await snapshotResponse.json();
for (const name of ["mealie", "vikunja", "homebox", "jellyfin", "homeAssistant"]) {
  const service = snapshot.services.find((item) => item.name === name);
  if (!service?.ok || !service?.connected) throw new Error(`${name} is not fully connected`);
}

const action = async (payload) => {
  const response = await fetch(`${base}/api/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`${payload.action} failed: ${response.status} ${await response.text()}`);
};

const shopping = snapshot.shopping.find((item) => item.shoppingListId);
if (shopping) {
  await action({ action: "shopping.toggle", id: shopping.id, checked: !shopping.checked, shoppingListId: shopping.shoppingListId, title: shopping.title });
  await action({ action: "shopping.toggle", id: shopping.id, checked: shopping.checked, shoppingListId: shopping.shoppingListId, title: shopping.title });
}

const search = await fetch(`${base}/api/search?q=te`).then((response) => response.json());
if (!Array.isArray(search.results)) throw new Error("Unified search contract failed");
console.log(JSON.stringify({ ok: true, integrations: 5, reversibleGroceryWrite: Boolean(shopping), searchResults: search.results.length }));

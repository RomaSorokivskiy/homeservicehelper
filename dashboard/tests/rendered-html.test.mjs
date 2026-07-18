import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the Ukrainian household dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html lang="uk"/i);
  assert.match(html, /<title>Наш дім(?: · Наш дім)?<\/title>/i);
  assert.match(html, /НАШ ДЕНЬ/);
  assert.match(html, /ШВИДКІ СЦЕНИ/);
  assert.match(html, /СЬОГОДНІ НА ВЕЧЕРЮ/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("exposes only the normalized snapshot endpoint", async () => {
  const response = await render("/api/snapshot");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.attention.title, "Усе гаразд");
  assert.ok(Array.isArray(payload.tasks));
  assert.equal(payload.services.length, 4);
  assert.equal(JSON.stringify(payload).includes("token"), false);
});

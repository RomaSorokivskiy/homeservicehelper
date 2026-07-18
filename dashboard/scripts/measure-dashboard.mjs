import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const browser = await chromium.launch();
const context = await browser.newContext({ httpCredentials: { username: process.env.E2E_USER || "roma", password: process.env.E2E_PASSWORD || "" }, ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const started = performance.now();
await page.goto(process.env.E2E_BASE_URL || "https://home.home.arpa", { waitUntil: "networkidle" });
const wallMs = performance.now() - started;
const metrics = await page.evaluate(() => {
  const navigation = performance.getEntriesByType("navigation")[0];
  const resources = performance.getEntriesByType("resource");
  const paint = performance.getEntriesByName("first-contentful-paint")[0];
  return { responseMs: navigation.responseEnd, domContentLoadedMs: navigation.domContentLoadedEventEnd, loadMs: navigation.loadEventEnd, firstContentfulPaintMs: paint?.startTime || null, transferredBytes: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0) };
});
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), commit: execFileSync("git",["rev-parse","--short","HEAD"],{encoding:"utf8"}).trim(), profile: "Playwright Chromium 140 · 1440x1000 · wired LAN", wallMs: Number(wallMs.toFixed(1)), ...metrics }, null, 2));
await browser.close();

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

test("authenticated household shell is operable and CSP-clean", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Спокійний ритм/ })).toBeVisible();
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: /Швидка команда|⌕/ }).click();
  else await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "Швидкі команди" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Дім" }).click();
  await expect(page.getByRole("heading", { name: /Менше кнопок/ })).toBeVisible();
  await page.getByRole("button", { name: "Сьогодні" }).click();
  await page.screenshot({ path: path.resolve("../docs/assets", `dashboard-${testInfo.project.name}.png`), fullPage: true });
  expect(errors.filter((message) => /content security policy|refused to/i.test(message))).toEqual([]);
});

test("reduced motion and cached snapshot survive an offline reload", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("home-snapshot-v1") !== null)).toBe(true);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).includes("our-home-shell-v1") && Boolean(await (await caches.open("our-home-shell-v1")).match("/")))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Панель працює офлайн")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Спокійний ритм/ })).toBeVisible();
});

test("primary household surface has no serious WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Спокійний ритм/ })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter(({ impact }) =>
      ["critical", "serious"].includes(impact || ""),
    ),
  ).toEqual([]);
});

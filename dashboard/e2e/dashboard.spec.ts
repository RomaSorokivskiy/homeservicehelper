import { expect, test } from "@playwright/test";
import path from "node:path";

test("authenticated household shell is operable and CSP-clean", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Спокійний ритм/ })).toBeVisible();
  await page.keyboard.press("Control+K");
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
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Панель працює офлайн")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Спокійний ритм/ })).toBeVisible();
});

import { chromium } from "playwright";
import fs from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

const BASE = "https://2110-app.vercel.app";
const OUT_DIR = "C:\\Users\\corym\\AppData\\Local\\Temp\\claude\\C--Users-corym\\bf69e0a7-5090-49ff-9f93-3d2c276294ba\\scratchpad\\shots6";
fs.mkdirSync(OUT_DIR, { recursive: true });

await clerkSetup();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await setupClerkTestingToken({ page });

await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
await page.fill('input[name="identifier"]', "qa-smoketest2@2110fitness.com");
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page.waitForTimeout(1200);
const pwField = page.locator('input[type="password"]').first();
await pwField.waitFor({ timeout: 15000 });
await pwField.fill("Tmp-Verify-Pass-2026y");
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page.waitForTimeout(2000);
console.log("After sign-in URL:", page.url());

// Check CSS actually served
const cssHref = await page.evaluate(() => {
  const link = document.querySelector('link[rel="stylesheet"]');
  return link ? link.href : null;
});
console.log("CSS file:", cssHref);
if (cssHref) {
  const cssResp = await page.request.get(cssHref);
  const cssText = await cssResp.text();
  console.log("CSS contains color-scheme dark rule:", cssText.includes("color-scheme:dark") || cssText.includes("color-scheme: dark"));
}

// Schedule coach dropdown
await page.goto(BASE + "/schedule", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const coachSelect = page.locator("select").first();
const computedColorScheme = await coachSelect.evaluate((el) => getComputedStyle(el).colorScheme);
console.log("Schedule select computed color-scheme:", computedColorScheme);
await coachSelect.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT_DIR}/schedule-dropdown.png` });
await page.keyboard.press("Escape");

// Preferences page time dropdown
await page.goto(BASE + "/preferences", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const timeSelect = page.locator("select").first();
const prefColorScheme = await timeSelect.evaluate((el) => getComputedStyle(el).colorScheme);
console.log("Preferences select computed color-scheme:", prefColorScheme);
await timeSelect.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT_DIR}/preferences-dropdown.png` });
await page.keyboard.press("Escape");

// Check html/root computed color-scheme and data-theme attr
const rootInfo = await page.evaluate(() => ({
  htmlDataTheme: document.documentElement.getAttribute("data-theme"),
  htmlColorScheme: getComputedStyle(document.documentElement).colorScheme,
  bodyColorScheme: getComputedStyle(document.body).colorScheme,
}));
console.log("Root info:", JSON.stringify(rootInfo));

await browser.close();

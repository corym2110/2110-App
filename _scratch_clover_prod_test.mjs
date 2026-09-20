import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import "dotenv/config";

process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
await clerkSetup();

const BASE = "https://2110-app.vercel.app";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
const page = await context.newPage();
await setupClerkTestingToken({ page });

page.on("console", (msg) => {
  const t = msg.text();
  if (t.includes("DevTools") || t.includes("HMR")) return;
  console.log("[browser]", msg.type(), t);
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto(`${BASE}/sign-in`);
await page.getByLabel(/email/i).first().fill("qa-smoketest2@2110fitness.com");
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page.getByLabel(/password/i).first().fill("QaSmoke!2110test");
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page.waitForTimeout(3000);

await page.goto(`${BASE}/members/cmu090ukz000004jv1cm7vpxp`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.getByRole("button", { name: /save a card|replace/i }).click();
await page.waitForTimeout(3000);

try {
  const numberInput = page.frameLocator("#clover-card-number iframe").locator("input").first();
  await numberInput.click({ timeout: 10000 });
  await numberInput.pressSequentially("6011361000006668", { delay: 30 });

  const dateInput = page.frameLocator("#clover-card-date iframe").locator("input").first();
  await dateInput.click();
  await dateInput.pressSequentially("1230", { delay: 30 });

  const cvvInput = page.frameLocator("#clover-card-cvv iframe").locator("input").first();
  await cvvInput.click();
  await cvvInput.pressSequentially("123", { delay: 30 });

  const postalInput = page.frameLocator("#clover-card-postal iframe").locator("input").first();
  await postalInput.click();
  await postalInput.pressSequentially("T2H1Z3", { delay: 30 });

  console.log("Filled all fields via keystrokes");
} catch (e) {
  console.log("Fill error:", e.message);
}

await page.getByRole("button", { name: "Save card" }).click();
await page.waitForTimeout(5000);
await page.screenshot({ path: "C:/Users/corym/Downloads/2110-fitness-clover-prod-result2.png" });

const errorText = await page.locator("text=/Clover|Couldn't|rejected|error/i").first().textContent().catch(() => null);
console.log("Error text on page:", errorText);

await browser.close();
console.log("done");

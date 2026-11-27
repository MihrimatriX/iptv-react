// Drives the built app like a remote would: loads dist/index.html from file://
// (as webOS/Tizen do), signs in to demo mode and walks every section.
// Usage: npm run build && node scripts/smoke.mjs [screenshot-dir]
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] ?? path.join(here, "../smoke-shots"));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
// Uncaught exceptions fail the run; console errors (e.g. a demo stream that
// can't be reached from CI) are only reported.
const errors = [];
const warnings = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => message.type() === "error" && warnings.push(message.text()));

const press = async (key, times = 1) => {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
};
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log("shot", name);
};
const expectText = async (text) => {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 5000 });
};

await page.goto(pathToFileURL(path.join(here, "../dist/index.html")).href);
await expectText("Demo ile dene");
await shot("01-login");

await press("ArrowDown", 4); // fields → "Giriş yap"
await press("ArrowRight"); // → "Demo ile dene"
await press("Enter");
await expectText("Tüm kanallar");
await page.waitForTimeout(1600); // EPG + preview delay
await shot("02-live");

await press("ArrowDown", 3);
await press("r"); // red: favourite
await page.waitForTimeout(1500);
await shot("03-live-focus");

await press("Enter");
await page.waitForTimeout(800);
await shot("04-live-full");
await press("ArrowDown"); // zap
await page.waitForTimeout(600);
await shot("05-live-zap");
await press("Escape");

await press("ArrowLeft", 2); // channels → categories → rail
await page.waitForTimeout(300);
await shot("06-rail");
await press("ArrowDown");
await press("Enter"); // Filmler
await expectText("Tüm filmler");
await shot("07-movies");
await press("ArrowRight", 2);
await press("ArrowDown");
await press("Enter");
await expectText("Yönetmen");
await shot("08-movie-detail");
await press("Escape");

await press("ArrowLeft", 3);
await press("ArrowLeft");
await press("ArrowDown");
await press("Enter"); // Diziler
await expectText("Tüm diziler");
await press("Enter");
await expectText("1. Sezon");
await shot("09-series-detail");
await press("Escape");

await press("ArrowLeft", 4);
await press("ArrowDown");
await press("Enter"); // Ara
await page.locator("input").first().fill("demo");
await page.waitForTimeout(800);
await press("ArrowDown");
await shot("10-search");

await press("ArrowLeft");
await press("ArrowDown");
await press("Enter"); // Ayarlar
await expectText("Oynatıcı");
await shot("11-settings");

await browser.close();
if (warnings.length) console.log(`${warnings.length} console error(s), e.g.: ${warnings[0]}`);
if (errors.length) {
  console.log("errors:\n" + errors.join("\n"));
  process.exitCode = 1;
} else console.log("no page errors");

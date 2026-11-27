// Copies dist/ plus a platform's manifest and icons into build/<platform>/
// with the version taken from package.json.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;

export function stage(platform) {
  const dist = path.join(root, "dist");
  if (!existsSync(path.join(dist, "index.html"))) {
    throw new Error("dist/ is missing: run `npm run build` first.");
  }
  const out = path.join(root, "build", platform);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(dist, out, { recursive: true });
  cpSync(path.join(root, "platforms", platform), out, { recursive: true });
  return out;
}

export function setVersion(file, replace) {
  writeFileSync(file, replace(readFileSync(file, "utf8")));
}

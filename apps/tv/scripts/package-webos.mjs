// Builds build/webos and packs it into an .ipk with ares-package
// (@webos-tools/cli), together with the JS service. Install on a TV in Developer Mode with:
//   npx ares-install --device <tv> out/com.afu.iptv_<version>_all.ipk
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { cpSync, rmSync } from "node:fs";
import { root, setVersion, stage, version } from "./stage.mjs";

const dir = stage("webos");
// The JS service ships in the same .ipk (it fetches what CORS blocks).
const serviceDir = path.join(root, "build", "webos-service");
rmSync(serviceDir, { recursive: true, force: true });
cpSync(path.join(root, "platforms", "webos-service"), serviceDir, { recursive: true });
setVersion(path.join(dir, "appinfo.json"), (text) => {
  const info = JSON.parse(text);
  info.version = version;
  return JSON.stringify(info, null, 2);
});
const out = path.join(root, "out");
mkdirSync(out, { recursive: true });
execFileSync("npx", ["ares-package", dir, serviceDir, "--outdir", out, "--no-minify"], { stdio: "inherit", cwd: root });

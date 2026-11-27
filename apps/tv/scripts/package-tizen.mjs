// Builds build/tizen and packs it into a .wgt.
// - With the Tizen CLI on PATH and TIZEN_PROFILE set (a Samsung certificate
//   profile from Certificate Manager), it runs `tizen package -t wgt -s …`
//   and the result installs on a TV in Developer Mode.
// - Without them it writes an unsigned .wgt (a zip). Samsung TVs refuse
//   unsigned packages; sign it with Tizen Studio before installing.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { root, setVersion, stage, version } from "./stage.mjs";

const dir = stage("tizen");
setVersion(path.join(dir, "config.xml"), (xml) =>
  xml.replace(/(<widget[^>]*\sversion=")[^"]*(")/, `$1${version}$2`)
);
const out = path.join(root, "out");
mkdirSync(out, { recursive: true });

const profile = process.env.TIZEN_PROFILE;
const hasCli = (() => {
  try {
    execFileSync("tizen", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

if (hasCli && profile) {
  execFileSync("tizen", ["package", "-t", "wgt", "-s", profile, "-o", out, "--", dir], { stdio: "inherit" });
  console.log(`Signed .wgt written to ${out}`);
} else {
  const file = path.join(out, `AfuIptv_${version}_unsigned.wgt`);
  rmSync(file, { force: true });
  execFileSync("zip", ["-r", "-q", "-X", file, "."], { cwd: dir, stdio: "inherit" });
  console.log(`Unsigned .wgt written to ${file}`);
  console.log("Sign it with a Samsung certificate (Tizen Studio) before installing on a TV.");
}

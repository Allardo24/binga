import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

// Supervisor scans every config.* in a repository, including nested source folders.
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const manifests = files.filter((file) => {
  const name = basename(file);
  return (
    name.startsWith("config.") &&
    [".yaml", ".yml", ".json"].includes(extname(name))
  );
});
if (manifests.length !== 1 || manifests[0] !== "binga/config.yaml") {
  throw new Error(
    `HA moet precies binga/config.yaml vinden; aangetroffen: ${manifests.join(", ") || "geen"}`,
  );
}

const manifest = readFileSync("binga/config.yaml", "utf8");
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
if (!manifest.includes(`version: "${version}"`)) {
  throw new Error("De HA-catalogusversie verschilt van package.json.");
}
if (!/^image: ghcr\.io\/allardo24\/binga$/m.test(manifest)) {
  throw new Error("De publieke HA-catalogus mist het GHCR-image.");
}
readFileSync("repository.yaml", "utf8");
console.log("HA-repository: één geldige catalogusconfig met image.");

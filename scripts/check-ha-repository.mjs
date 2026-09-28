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
const catalogVersion = manifest.match(/^version:\s*"(\d+\.\d+\.\d+)"/m)?.[1];
if (!catalogVersion) {
  throw new Error("De HA-catalogus mist een geldig versienummer.");
}
const sourceParts = version.split(".").map(Number);
const catalogParts = catalogVersion.split(".").map(Number);
const firstDifference = catalogParts.findIndex(
  (part, index) => part !== sourceParts[index],
);
if (
  sourceParts.length !== 3 ||
  sourceParts.some((part) => !Number.isInteger(part)) ||
  (firstDifference >= 0 &&
    catalogParts[firstDifference] > sourceParts[firstDifference])
) {
  throw new Error(
    `De HA-catalogus (${catalogVersion}) mag niet nieuwer zijn dan de broncode (${version}).`,
  );
}
if (!/^image: ghcr\.io\/allardo24\/binga$/m.test(manifest)) {
  throw new Error("De publieke HA-catalogus mist het GHCR-image.");
}
readFileSync("repository.yaml", "utf8");
console.log(
  `HA-repository: één geldige catalogusconfig met image (catalogus ${catalogVersion}, broncode ${version}).`,
);

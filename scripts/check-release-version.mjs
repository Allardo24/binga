import { readFileSync } from "node:fs";

const expected = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(expected || "")) {
  throw new Error("Geef een versie als x.y.z mee.");
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const cargo = readFileSync("server/Cargo.toml", "utf8");
const cargoLock = readFileSync("server/Cargo.lock", "utf8");
const addon = readFileSync("deploy/home-assistant/config.source.yaml", "utf8");

const versions = {
  "package.json": packageJson.version,
  "package-lock.json": lock.version,
  'package-lock.json packages[""]': lock.packages?.[""]?.version,
  "server/Cargo.toml": cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1],
  "server/Cargo.lock": cargoLock.match(
    /name = "binga-server"\s+version = "([^"]+)"/,
  )?.[1],
  "deploy/home-assistant/config.source.yaml": addon.match(
    /^version:\s*"([^"]+)"/m,
  )?.[1],
};

for (const [file, version] of Object.entries(versions)) {
  if (version !== expected) {
    throw new Error(
      `${file}: versie ${version || "ontbreekt"}, verwacht ${expected}`,
    );
  }
}
console.log(`Alle versies zijn ${expected}.`);

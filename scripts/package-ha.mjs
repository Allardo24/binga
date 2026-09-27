import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const project = resolve(".");
const output = resolve("build-artifacts/home-assistant-repository");
const addon = join(output, "binga");
const checkOnly = process.argv.includes("--check");

const files = [
  "Dockerfile",
  ".dockerignore",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "src",
  "server/Cargo.toml",
  "server/Cargo.lock",
  "server/src",
  "deploy/home-assistant/config.source.yaml",
  "deploy/home-assistant/DOCS.md",
  "deploy/home-assistant/CHANGELOG.md",
];

function copy(relative) {
  const source = join(project, relative);
  if (!existsSync(source))
    throw new Error(`Ontbrekend pakketbestand: ${relative}`);
  const targetName =
    relative === "deploy/home-assistant/config.source.yaml"
      ? "config.yaml"
      : relative.startsWith("deploy/home-assistant/")
        ? relative.slice("deploy/home-assistant/".length)
        : relative;
  const target = join(addon, targetName);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

if (!checkOnly) {
  rmSync(output, { recursive: true, force: true });
  mkdirSync(addon, { recursive: true });
  for (const file of files) copy(file);
  cpSync(
    join(project, "deploy/home-assistant/repository.yaml"),
    join(output, "repository.yaml"),
  );
  cpSync(
    join(project, "deploy/home-assistant/README.md"),
    join(output, "README.md"),
  );
}

const required = [
  "repository.yaml",
  "binga/config.yaml",
  "binga/Dockerfile",
  "binga/package-lock.json",
  "binga/server/Cargo.lock",
  "binga/server/src/main.rs",
  "binga/src/main.tsx",
];
for (const relative of required) {
  if (!existsSync(join(output, relative)))
    throw new Error(`Onvolledige HA-bundel: ${relative} ontbreekt.`);
}

const config = readFileSync(join(addon, "config.yaml"), "utf8");
const packageJson = JSON.parse(
  readFileSync(join(project, "package.json"), "utf8"),
);
const cargo = readFileSync(join(project, "server/Cargo.toml"), "utf8");
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const configVersion = config.match(/^version:\s*"([^"]+)"/m)?.[1];
if (
  !cargoVersion ||
  configVersion !== packageJson.version ||
  cargoVersion !== packageJson.version
) {
  throw new Error(
    `Versies lopen uiteen: package=${packageJson.version}, Cargo=${cargoVersion}, HA=${configVersion}`,
  );
}
for (const expected of [
  "aarch64",
  "8080/tcp",
  "backup: cold",
  "stage: experimental",
]) {
  if (!config.includes(expected))
    throw new Error(`HA-config mist: ${expected}`);
}

writeFileSync(join(output, ".package-ok"), `Binga ${configVersion}\n`, "utf8");
console.log(
  checkOnly
    ? `HA-bundel gecontroleerd: ${output}`
    : `HA-bundel gemaakt: ${output}`,
);

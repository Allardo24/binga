import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";

const image = process.argv[2];
if (
  !/^ghcr\.io\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(image || "")
) {
  throw new Error(
    "Geef een GHCR-image op, bijvoorbeeld ghcr.io/allardo24/binga.",
  );
}

const project = resolve(".");
const output = resolve("build-artifacts/ha-catalog");
const within = relative(project, output);
if (within.startsWith(`..${sep}`) || within === ".." || within === "") {
  throw new Error("Cataloguspad ligt buiten de projectmap.");
}

const source = resolve("deploy/home-assistant");
const config = readFileSync(resolve(source, "addon-manifest.yaml"), "utf8");
if (config.includes("\nimage:"))
  throw new Error("De bronconfig bevat al een image.");

rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, "binga"), { recursive: true });
cpSync(resolve(source, "repository.yaml"), resolve(output, "repository.yaml"));
for (const name of ["DOCS.md", "CHANGELOG.md"]) {
  cpSync(resolve(source, name), resolve(output, "binga", name));
}
writeFileSync(
  resolve(output, "binga/config.yaml"),
  `${config.trimEnd()}\nimage: ${image}\n`,
  "utf8",
);
console.log(`HA-catalogus klaar: ${output}`);

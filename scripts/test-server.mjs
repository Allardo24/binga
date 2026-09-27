import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, delimiter } from "node:path";
const data = mkdtempSync(join(tmpdir(), "binga-e2e-"));
const binary = resolve(
  `server/target/debug/binga-server${process.platform === "win32" ? ".exe" : ""}`,
);
const child = spawn(binary, [], {
  stdio: "inherit",
  env: {
    ...process.env,
    BINGA_BIND: "127.0.0.1:18080",
    BINGA_DATA_DIR: data,
    PATH: [resolve(".tools/mingw64/bin"), process.env.PATH].join(delimiter),
  },
});
child.on("error", (e) => {
  console.error(e);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code || 0));
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, delimiter } from "node:path";
import { homedir } from "node:os";

const env = { ...process.env };
const cargoDir = resolve(homedir(), ".cargo/bin");
for (const key of Object.keys(env))
  if (key.toLowerCase() === "path") delete env[key];
env.PATH = [resolve(".tools/mingw64/bin"), cargoDir, process.env.PATH].join(
  delimiter,
);
const npm =
  process.env.npm_execpath ||
  (existsSync(".tools/package/bin/npm-cli.js")
    ? resolve(".tools/package/bin/npm-cli.js")
    : null);
if (!npm) throw new Error("Start met npm run dev.");
const cargoArgs =
  process.platform === "win32" && existsSync(".tools/mingw64/bin/gcc.exe")
    ? ["+stable-x86_64-pc-windows-gnu"]
    : [];
const children = [
  spawn(
    "cargo",
    [...cargoArgs, "run", "--manifest-path", "server/Cargo.toml"],
    { env, stdio: "inherit", detached: process.platform !== "win32" },
  ),
  spawn(process.execPath, [npm, "run", "web:dev"], {
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children)
    if (child.pid) {
      if (process.platform === "win32")
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      else {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {}
      }
    }
  process.exit(code);
}
for (const child of children) {
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

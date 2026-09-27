import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, resolve } from "node:path";
import { homedir } from "node:os";
import { networkInterfaces } from "node:os";

const env = { ...process.env };
for (const key of Object.keys(env))
  if (key.toLowerCase() === "path") delete env[key];
env.PATH = [
  resolve(".tools/mingw64/bin"),
  resolve(homedir(), ".cargo/bin"),
  process.env.PATH,
].join(delimiter);
env.BINGA_BIND = env.BINGA_BIND || "0.0.0.0:5173";
env.BINGA_WEB_DIR = resolve("dist");
env.BINGA_DATA_DIR = resolve("server-data");

console.log("");
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((address) => address?.family === "IPv4" && !address.internal)
  .map((address) => address.address);
console.log("Binga draait straks op http://127.0.0.1:5173/");
for (const address of lanAddresses) {
  console.log(`Telefoon (zelfde wifi): http://${address}:5173/`);
}
console.log("Laat dit venster open. Stop Binga met Ctrl+C.");
console.log("");

const localGnu =
  process.platform === "win32" && existsSync(".tools/mingw64/bin/gcc.exe");
const child = spawn(
  "cargo",
  [
    ...(localGnu ? ["+stable-x86_64-pc-windows-gnu"] : []),
    "run",
    "--locked",
    "--manifest-path",
    "server/Cargo.toml",
  ],
  { env, stdio: "inherit", detached: process.platform !== "win32" },
);

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (child.pid) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    }
  }
  process.exit(code);
}
child.on("error", (error) => {
  console.error(`Binga kon niet starten: ${error.message}`);
  stop(1);
});
child.on("exit", (code) => stop(code || 0));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

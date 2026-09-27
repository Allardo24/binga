import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, delimiter } from "node:path";
import { homedir } from "node:os";
const localGnu =
  process.platform === "win32" && existsSync(".tools/mingw64/bin/gcc.exe");
const env = {
  ...process.env,
  PATH: [
    resolve(".tools/mingw64/bin"),
    resolve(homedir(), ".cargo/bin"),
    process.env.PATH,
  ].join(delimiter),
};
const child = spawn(
  "cargo",
  [
    ...(localGnu ? ["+stable-x86_64-pc-windows-gnu"] : []),
    process.argv[2],
    "--manifest-path",
    "server/Cargo.toml",
    ...process.argv.slice(3),
  ],
  { env, stdio: "inherit" },
);
child.on("error", (e) => {
  console.error(e.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code || 0));

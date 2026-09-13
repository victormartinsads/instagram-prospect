import { spawn } from "child_process";
import { resolve } from "path";

process.env.DATABASE_URL = resolve("./data/demo.db");
process.env.NEXT_DIST_DIR = ".next-demo";
process.env.PORT = "3001";

console.log("Starting Demo Next.js server on port 3001...");
console.log("Database: ./data/demo.db");

const child = spawn(
  "pnpm",
  ["next", "dev", "-p", "3001"],
  {
    cwd: resolve("."),
    env: {
      ...process.env,
      DATABASE_URL: resolve("./data/demo.db"),
      NEXT_DIST_DIR: ".next-demo",
      PORT: "3001",
    },
    shell: true,
    stdio: "inherit",
  }
);

child.on("exit", (code) => {
  console.log(`Demo server exited with code ${code}`);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
  process.exit();
});

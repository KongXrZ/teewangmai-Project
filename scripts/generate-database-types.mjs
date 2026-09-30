import { spawnSync } from "node:child_process";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const packageUrl = new URL("node_modules/supabase/package.json", root);
const cliPackage = JSON.parse(readFileSync(packageUrl, "utf8"));
const cliEntry = new URL(cliPackage.bin.supabase, packageUrl);
const result = spawnSync(
  process.execPath,
  [fileURLToPath(cliEntry), "gen", "types", "--local", "--lang", "typescript", "--schema", "public"],
  { cwd: fileURLToPath(root), encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);

if (result.error || result.status !== 0) {
  console.error(result.error?.message || result.stderr || "Supabase type generation failed.");
  process.exit(result.status || 1);
}

if (!/export type Database\s*=/.test(result.stdout)) {
  console.error("Supabase did not return database types; the existing file was preserved.");
  process.exit(1);
}

const destination = new URL("src/types/database.ts", root);
const temporary = new URL("src/types/database.ts.tmp", root);
writeFileSync(temporary, result.stdout, "utf8");
renameSync(temporary, destination);
console.log("Generated src/types/database.ts from the local public schema.");

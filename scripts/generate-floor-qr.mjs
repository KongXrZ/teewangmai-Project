import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { generateFloorQr, readFloorSnapshot } from "./lib/floor-qr.mjs";

const query = `begin transaction isolation level repeatable read read only;
select coalesce(json_agg(row_to_json(source)), '[]'::json) from (
  select l.id as location_id, l.building, l.name as building_name,
    l.is_active as location_active, f.id as floor_id, f.floor_name,
    f.is_active as floor_active, f.qr_code_id
  from public.floors f join public.locations l on l.id = f.location_id
  order by l.id, f.id
) source;
commit;`;

async function main() {
  const { values } = parseArgs({ options: {
    input: { type: "string" }, output: { type: "string" },
    container: { type: "string", default: "supabase_db_teewangmai" },
    help: { type: "boolean", short: "h" },
  } });
  if (values.help) {
    console.log("npm run qr:generate -- --output <new-directory> [--input <approved-snapshot.json>] [--container <local-db-container>]");
    return;
  }
  if (!values.output) throw new Error("Specify --output with a new directory for this print batch");
  const output = resolve(values.output);
  let rows;
  if (values.input) {
    rows = await readFloorSnapshot(values.input);
  } else {
    const json = execFileSync("docker", ["exec", "-i", values.container, "psql", "-U", "postgres",
      "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], {
      input: query, encoding: "utf8", timeout: 30000, maxBuffer: 10 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
    rows = JSON.parse(json);
  }
  const manifest = await generateFloorQr(rows, output);
  console.log(`Generated ${manifest.printable_floors} printable QR codes from ${manifest.total_floors} floors.`);
  console.log(`Output: ${output}`);
}

main().catch((error) => {
  if (error.code === "EEXIST") console.error("Output already exists. Choose a new directory to preserve the earlier print batch.");
  else if (error.name === "ZodError") console.error("Invalid floor snapshot. Check required fields, IDs, active flags and QR UUIDs.");
  else console.error(error.message);
  process.exitCode = 1;
});

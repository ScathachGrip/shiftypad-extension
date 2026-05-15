import { join } from "path";

const root = join(import.meta.dir, "..");
const p = await Bun.file(join(root, "package.json")).json();

const out = join(root, "dist", "apexcharts.min.js");
const url = `${p.apexcharts_browser}/dist/apexcharts.min.js`;

console.log(`Downloading ApexCharts from: ${url}`);

const proc = Bun.spawnSync(["curl", "-fsSL", "--retry", "5", "--retry-delay", "2", "-o", out, url]);

if (proc.exitCode !== 0) {
  console.error(`Failed to download ApexCharts: ${proc.stderr.toString()}`);
  process.exit(1);
}

console.log(`Saved to: ${out}`);
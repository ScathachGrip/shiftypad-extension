import fs from "fs";
import path from "path";

type RaidDamageRow = {
  boss: string;
  difficulty: string;
  level: number;
  damage: number;
};

type PlayerRaidResult = {
  player: string;
  synchro: number;
  total_attempt: number;
  total_damage?: number;
  rows: RaidDamageRow[];
};

// Load sample dataset from tests folder.
const filePath = path.resolve(__dirname, "89c680a3-36a4-4c12-881b-1f6b2c7307ff.json");
const raw = fs.readFileSync(filePath, "utf-8");
const data: PlayerRaidResult[] = JSON.parse(raw);

// Only keep full 3-attempt players so the comparison is fair.
const candidates = data.filter((p) => p.total_attempt === 3 && p.synchro > 0);

if (!candidates.length) {
  console.log("No candidates with total_attempt === 3");
  process.exit(0);
}

// Prefer the precomputed total_damage, otherwise sum the 3 boss rows.
const totalDamage = (p: PlayerRaidResult): number =>
  p.total_damage ?? p.rows.reduce((sum, r) => sum + r.damage, 0);

// Fit a linear model: expected_damage = a * synchro + b.
// This is ordinary least squares on the (synchro, total_damage) points.
const fitLinear = (items: PlayerRaidResult[]): { a: number; b: number } => {
  const xs = items.map((p) => p.synchro);
  const ys = items.map((p) => totalDamage(p));
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }
  const a = den === 0 ? 0 : num / den;
  const b = meanY - a * meanX;
  return { a, b };
};

// These are the "expected damage" parameters derived from the dataset.
const { a, b } = fitLinear(candidates);

// Residual = actual_damage - expected_damage.
// Highest residual = most efficient (biggest over-performance vs expectation).
const ranked = [...candidates].sort((p1, p2) => {
  const r1 = totalDamage(p1) - (a * p1.synchro + b);
  const r2 = totalDamage(p2) - (a * p2.synchro + b);
  if (r2 !== r1) {return r2 - r1;}
  return totalDamage(p2) - totalDamage(p1);
});

const formatShort = (val: number): string => {
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) {return `${(val / 1_000_000_000).toFixed(1)}B`;}
  if (abs >= 1_000_000) {return `${(val / 1_000_000).toFixed(1)}M`;}
  if (abs >= 1_000) {return `${(val / 1_000).toFixed(1)}K`;}
  return `${val.toFixed(0)}`;
};

const top5 = ranked.slice(0, 5).map((p) => {
  const total = totalDamage(p);
  const residual = total - (a * p.synchro + b);
  return {
    player: p.player,
    synchro: p.synchro,
    total_attempt: p.total_attempt,
    total_damage: total,
    residual: formatShort(residual)
  };
});

console.log("Top 5 efficiency (expected damage = a*synchro + b, by residual):");
console.log(top5);

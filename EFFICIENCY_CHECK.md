# Efficiency Check

This workflow identifies the most "efficient" player based on how far their actual damage exceeds an expected damage line derived from the data.

## What it does

1. Loads `tests/some_union_data_89c680a3-36a4-4c12-881b-1f6b2c7307ff.json`.

2. Keeps only players with `total_attempt === 3` and valid `synchro`.

3. Computes `total_damage` (uses `total_damage` if present, otherwise sums 3 boss rows).

```ts
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
```
4. Fits a linear model from the dataset:

   `expected_damage = a * synchro + b`

5. Computes each player's **residual**:

   `residual = actual_damage - expected_damage`

```ts
// These are the "expected damage" parameters derived from the dataset.
const { a, b } = fitLinear(candidates);

// Residual = actual_damage - expected_damage.
// Highest residual = most efficient (biggest over-performance vs expectation).
const ranked = [...candidates].sort((p1, p2) => {
  const r1 = totalDamage(p1) - (a * p1.synchro + b);
  const r2 = totalDamage(p2) - (a * p2.synchro + b);
  if (r2 !== r1) return r2 - r1;
  return totalDamage(p2) - totalDamage(p1);
});
```

6. The player with the **largest residual** is the **Efficiency picked**.

## Why residuals

- Synchro is a proxy for power. Higher synchro normally means higher damage.
- The linear fit captures the **average** damage at each synchro level.
- Residuals measure **who beats the average the most**, which is the intended definition of efficiency.

## Output

The script prints:

- The fitted parameters `a` and `b`
- The efficiency winner
- The top 5 players by residual

If you want to test a different dataset, replace the JSON file used in the script.  
If you disagree with this approach or have a better idea, please open a PR or create an issue. I'm always happy to receive Pull requests to improve things.

/**
 * Brier Score calculation and Murphy decomposition.
 *
 * Brier Score = 1/N * Σ(p_i - o_i)²
 * Decomposition: BS = Calibration + Refinement - Uncertainty
 */

export function brierScore(probabilities: number[], outcomes: number[]): number {
  if (probabilities.length !== outcomes.length || probabilities.length === 0) {
    return 0;
  }
  const n = probabilities.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (probabilities[i] - outcomes[i]) ** 2;
  }
  return sum / n;
}

export interface BrierDecomposition {
  total: number;
  calibration: number;
  refinement: number;
  uncertainty: number;
}

/**
 * Murphy decomposition of Brier Score.
 * Groups predictions into K bins (deciles).
 */
export function brierDecomposition(
  probabilities: number[],
  outcomes: number[],
  binCount = 10
): BrierDecomposition {
  const n = probabilities.length;
  if (n === 0) return { total: 0, calibration: 0, refinement: 0, uncertainty: 0 };

  const bins: Array<{ pSum: number; oSum: number; count: number }> = Array.from(
    { length: binCount },
    () => ({ pSum: 0, oSum: 0, count: 0 })
  );

  for (let i = 0; i < n; i++) {
    const binIdx = Math.min(Math.floor(probabilities[i] * binCount), binCount - 1);
    bins[binIdx].pSum += probabilities[i];
    bins[binIdx].oSum += outcomes[i];
    bins[binIdx].count++;
  }

  const oBar = outcomes.reduce((a, b) => a + b, 0) / n;
  let calibration = 0;
  let refinement = 0;

  for (const bin of bins) {
    if (bin.count === 0) continue;
    const pK = bin.pSum / bin.count;
    const oK = bin.oSum / bin.count;
    calibration += (bin.count / n) * (pK - oK) ** 2;
    refinement += (bin.count / n) * oK * (1 - oK);
  }

  const uncertainty = oBar * (1 - oBar);

  return {
    total: brierScore(probabilities, outcomes),
    calibration,
    refinement,
    uncertainty,
  };
}

export function calibrationCurve(
  probabilities: number[],
  outcomes: number[],
  binCount = 10
): Array<{ bin: string; predicted: number; observed: number; count: number }> {
  const bins: Array<{ pSum: number; oSum: number; count: number }> = Array.from(
    { length: binCount },
    () => ({ pSum: 0, oSum: 0, count: 0 })
  );

  for (let i = 0; i < probabilities.length; i++) {
    const binIdx = Math.min(Math.floor(probabilities[i] * binCount), binCount - 1);
    bins[binIdx].pSum += probabilities[i];
    bins[binIdx].oSum += outcomes[i];
    bins[binIdx].count++;
  }

  return bins.map((bin, i) => ({
    bin: `${i * 10}-${(i + 1) * 10}%`,
    predicted: bin.count > 0 ? bin.pSum / bin.count : 0,
    observed: bin.count > 0 ? bin.oSum / bin.count : 0,
    count: bin.count,
  }));
}

export function getCurrentPhase(drillCounts: {
  quantification: number;
  biasCheck: number;
  confidenceInterval: number;
}, weeksSinceStart: number): { phase: number; canAdvance: boolean } {
  const phase2MinWeeks = 2;
  const phase2MinDrills = { quantification: 20, biasCheck: 15, confidenceInterval: 5 };
  const phase3MinWeeks = 8;
  const phase3MinDrills = { quantification: 60, biasCheck: 40, confidenceInterval: 15 };

  if (weeksSinceStart >= phase3MinWeeks &&
      drillCounts.quantification >= phase3MinDrills.quantification &&
      drillCounts.biasCheck >= phase3MinDrills.biasCheck &&
      drillCounts.confidenceInterval >= phase3MinDrills.confidenceInterval) {
    return { phase: 3, canAdvance: true };
  }

  if (weeksSinceStart >= phase2MinWeeks &&
      drillCounts.quantification >= phase2MinDrills.quantification &&
      drillCounts.biasCheck >= phase2MinDrills.biasCheck &&
      drillCounts.confidenceInterval >= phase2MinDrills.confidenceInterval) {
    return { phase: 2, canAdvance: true };
  }

  return { phase: 1, canAdvance: false };
}

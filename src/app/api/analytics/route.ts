import { db } from "@/lib/db/client";
import { predictionQuestions, predictions, drills } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { brierDecomposition, calibrationCurve } from "@/lib/utils/brier";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  // Get resolved predictions with Brier scores
  const resolvedQuestions = await db.select()
    .from(predictionQuestions)
    .where(and(eq(predictionQuestions.userId, userId), eq(predictionQuestions.active, false)));

  const brierHistory: Array<{ date: string; score: number }> = [];
  const allProbs: number[] = [];
  const allOutcomes: number[] = [];

  for (const q of resolvedQuestions) {
    if (q.outcome === null) continue;
    const preds = await db.select()
      .from(predictions)
      .where(and(eq(predictions.questionId, q.id), eq(predictions.isFinal, true)))
      .orderBy(desc(predictions.createdAt))
      .limit(1);

    if (preds.length > 0 && preds[0].brierScore !== null) {
      const outcomeNum = q.outcome ? 1 : 0;
      allProbs.push(preds[0].probability);
      allOutcomes.push(outcomeNum);
      brierHistory.push({
        date: q.resolvedAt?.toISOString().slice(0, 10) ?? "",
        score: preds[0].brierScore,
      });
    }
  }

  // Get drill stats
  const allDrills = await db.select()
    .from(drills)
    .where(eq(drills.userId, userId));

  const completedDrills = allDrills.filter(d => d.completedAt);
  const drillScores = completedDrills.filter(d => d.score !== null).map(d => d.score!);
  const avgDrillScore = drillScores.length > 0
    ? drillScores.reduce((a, b) => a + b, 0) / drillScores.length
    : 0;

  // Get drill type distribution
  const drillTypeCount: Record<string, number> = {};
  for (const d of allDrills) {
    drillTypeCount[d.type] = (drillTypeCount[d.type] ?? 0) + 1;
  }

  const decomposition = brierDecomposition(allProbs, allOutcomes);
  const calibration = calibrationCurve(allProbs, allOutcomes);

  return Response.json({
    brierHistory,
    currentBrier: brierHistory.length > 0 ? brierHistory[brierHistory.length - 1].score : null,
    avgBrier: allProbs.length > 0 ? decomposition.total : null,
    decomposition: allProbs.length > 0 ? decomposition : null,
    calibrationPoints: calibration,
    totalResolved: resolvedQuestions.filter(q => q.outcome !== null).length,
    totalActive: resolvedQuestions.filter(q => q.active).length,
    drillStats: {
      total: allDrills.length,
      completed: completedDrills.length,
      avgScore: Math.round(avgDrillScore * 100) / 100,
      typeDistribution: drillTypeCount,
    },
  });
}

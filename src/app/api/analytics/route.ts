import { db } from "@/lib/db/client";
import { predictionQuestions, predictions, drills } from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { brierDecomposition, calibrationCurve } from "@/lib/utils/brier";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  // Get resolved predictions with Brier scores — batch fetch all at once
  const resolvedQuestions = await db.select()
    .from(predictionQuestions)
    .where(and(eq(predictionQuestions.userId, userId), eq(predictionQuestions.active, false)));

  const resolvedQuestionIds = resolvedQuestions.filter(q => q.outcome !== null).map(q => q.id);

  let allProbs: number[] = [];
  let allOutcomes: number[] = [];
  const brierHistory: Array<{ date: string; score: number }> = [];

  if (resolvedQuestionIds.length > 0) {
    // Single batch query instead of N+1
    const finalPredictions = await db.select()
      .from(predictions)
      .where(and(
        inArray(predictions.questionId, resolvedQuestionIds),
        eq(predictions.isFinal, true),
      ));

    // Build a map of questionId -> latest prediction
    const latestByQuestion = new Map<string, typeof predictions.$inferSelect>();
    for (const p of finalPredictions) {
      const existing = latestByQuestion.get(p.questionId);
      if (!existing || p.createdAt > existing.createdAt) {
        latestByQuestion.set(p.questionId, p);
      }
    }

    for (const q of resolvedQuestions) {
      if (q.outcome === null) continue;
      const pred = latestByQuestion.get(q.id);
      if (pred && pred.brierScore !== null) {
        const outcomeNum = q.outcome ? 1 : 0;
        allProbs.push(pred.probability);
        allOutcomes.push(outcomeNum);
        brierHistory.push({
          date: q.resolvedAt?.toISOString().slice(0, 10) ?? "",
          score: pred.brierScore,
        });
      }
    }
  }

  // Get drill stats in a single query
  const allDrills = await db.select()
    .from(drills)
    .where(eq(drills.userId, userId));

  const completedDrills = allDrills.filter(d => d.completedAt);
  const drillScores = completedDrills.filter(d => d.score !== null).map(d => d.score!);
  const avgDrillScore = drillScores.length > 0
    ? drillScores.reduce((a, b) => a + b, 0) / drillScores.length
    : 0;

  // Drill type distribution
  const drillTypeCount: Record<string, number> = {};
  for (const d of allDrills) {
    drillTypeCount[d.type] = (drillTypeCount[d.type] ?? 0) + 1;
  }

  // Streak calculation: count consecutive days with completed drills
  const streak = calculateStreak(completedDrills.map(d => d.completedAt!).sort((a, b) => b.getTime() - a.getTime()));

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
    streak,
    drillStats: {
      total: allDrills.length,
      completed: completedDrills.length,
      avgScore: Math.round(avgDrillScore * 100) / 100,
      typeDistribution: drillTypeCount,
    },
  });
}

function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if the most recent drill was today or yesterday (otherwise streak is 0)
  const mostRecent = dates[0];
  mostRecent.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - mostRecent.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    prev.setHours(0, 0, 0, 0);
    const curr = new Date(dates[i]);
    curr.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff === 1) {
      streak++;
    } else if (dayDiff > 1) {
      break;
    }
  }

  return streak;
}

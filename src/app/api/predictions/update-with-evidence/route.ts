import { db } from "@/lib/db/client";
import { predictions, evidence } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getBayesianUpdate } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { questionId, userId, evidenceSummary, evidenceStrength, evidenceDirection } = await req.json();

    if (!questionId || !userId || !evidenceSummary) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the latest final prediction
    const latestPred = await db.select()
      .from(predictions)
      .where(and(
        eq(predictions.questionId, questionId),
        eq(predictions.userId, userId),
        eq(predictions.isFinal, true),
      ))
      .orderBy(desc(predictions.createdAt))
      .limit(1)
      .then(r => r[0]);

    if (!latestPred) {
      return Response.json({ error: "No prediction found for this question" }, { status: 404 });
    }

    // Save evidence to DB
    const evidenceId = uuid();
    await db.insert(evidence).values({
      id: evidenceId,
      predictionId: latestPred.id,
      summary: evidenceSummary,
      strength: evidenceStrength ?? "medium",
      direction: evidenceDirection ?? "neutral",
      createdAt: new Date(),
    });

    // Call AI for Bayesian update
    let posteriorProbability = latestPred.probability;
    let stepByStep = "";
    try {
      const aiResult = await getBayesianUpdate({
        priorProbability: latestPred.probability,
        evidenceStrength: evidenceStrength ?? "medium",
        evidenceDirection: evidenceDirection ?? "neutral",
      });
      if (aiResult.posteriorProbability !== undefined) {
        posteriorProbability = aiResult.posteriorProbability;
        stepByStep = aiResult.stepByStep ?? "";
      }
    } catch {
      // Fallback: simple Bayesian update with hardcoded LR
      const lrMap: Record<string, number> = { strong: 3.0, medium: 1.7, weak: 1.3 };
      const dirMap: Record<string, number> = { supports: 1, opposes: -1, neutral: 0 };
      const lr = lrMap[(evidenceStrength as string) ?? "medium"];
      const dir = dirMap[(evidenceDirection as string) ?? "neutral"];
      const effectiveLr = dir === 0 ? 1 : dir > 0 ? lr : 1 / lr;
      const priorOdds = latestPred.probability / (1 - latestPred.probability);
      const posteriorOdds = priorOdds * effectiveLr;
      posteriorProbability = posteriorOdds / (1 + posteriorOdds);
      stepByStep = `先验概率: ${Math.round(latestPred.probability * 100)}%, 似然比: ${effectiveLr.toFixed(2)}, 后验概率: ${Math.round(posteriorProbability * 100)}%`;
    }

    // Create new prediction version with updated probability
    const newPredictionId = uuid();
    const newVersion = latestPred.version + 1;
    await db.insert(predictions).values({
      id: newPredictionId,
      questionId,
      userId,
      probability: posteriorProbability,
      reasoning: latestPred.reasoning,
      baselineRate: latestPred.baselineRate,
      sourceGrades: latestPred.sourceGrades,
      biasNotes: latestPred.biasNotes,
      version: newVersion,
      isFinal: true,
      createdAt: new Date(),
    });

    // Mark old prediction as not final
    await db.update(predictions)
      .set({ isFinal: false })
      .where(eq(predictions.id, latestPred.id));

    return Response.json({
      evidenceId,
      newPredictionId,
      posteriorProbability,
      stepByStep,
      version: newVersion,
    });
  } catch (error) {
    console.error("Bayesian update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

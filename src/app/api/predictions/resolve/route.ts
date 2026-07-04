import { db } from "@/lib/db/client";
import { predictionQuestions, predictions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { brierScore } from "@/lib/utils/brier";

export async function POST(req: Request) {
  try {
    const { questionId, userId, outcome } = await req.json();

    if (!questionId || !userId || outcome === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Mark question as resolved
    await db.update(predictionQuestions)
      .set({ outcome, resolvedAt: new Date(), active: false })
      .where(eq(predictionQuestions.id, questionId));

    // Get all final predictions for this question (version history)
    const allPredictions = await db.select()
      .from(predictions)
      .where(and(
        eq(predictions.questionId, questionId),
        eq(predictions.userId, userId),
      ))
      .orderBy(predictions.createdAt);

    // Calculate Brier score for each version
    const outcomeNum = outcome ? 1 : 0;
    for (const p of allPredictions) {
      const bs = (p.probability - outcomeNum) ** 2;
      await db.update(predictions)
        .set({ brierScore: bs })
        .where(eq(predictions.id, p.id));
    }

    return Response.json({ success: true, brierScore: (allPredictions[allPredictions.length - 1]?.probability ?? 0.5 - outcomeNum) ** 2 });
  } catch (error) {
    console.error("Resolve prediction error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

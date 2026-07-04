import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { predictionQuestions, predictions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { PredictionsClient } from "./PredictionsClient";

async function getUserPredictions(userId: string) {
  const questions = await db.select()
    .from(predictionQuestions)
    .where(and(eq(predictionQuestions.userId, userId), eq(predictionQuestions.active, true)))
    .orderBy(desc(predictionQuestions.createdAt));

  const result = [];
  for (const q of questions) {
    const preds = await db.select()
      .from(predictions)
      .where(and(eq(predictions.questionId, q.id), eq(predictions.isFinal, true)))
      .orderBy(desc(predictions.createdAt))
      .limit(1);

    result.push({
      id: q.id,
      questionText: q.questionText,
      domain: q.domain,
      createdAt: q.createdAt.toISOString(),
      latestPrediction: preds[0] ? {
        probability: preds[0].probability,
        reasoning: preds[0].reasoning,
        baselineRate: preds[0].baselineRate,
        version: preds[0].version,
        createdAt: preds[0].createdAt.toISOString(),
      } : null,
    });
  }
  return result;
}

export default async function PredictionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const activeQuestions = await getUserPredictions(userId);

  return <PredictionsClient userId={userId} initialQuestions={activeQuestions} />;
}

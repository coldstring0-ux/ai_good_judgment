import { db } from "@/lib/db/client";
import { predictionQuestions, predictions } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  try {
    const { userId, questionText, domain, resolutionCriteria, probability, reasoning, baselineRate, sourceGrades, biasNotes } = await req.json();

    if (!userId || !questionText) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (probability !== undefined && (typeof probability !== "number" || probability < 0 || probability > 1)) {
      return Response.json({ error: "Probability must be a number between 0 and 1" }, { status: 400 });
    }

    const questionId = uuid();
    const now = new Date();

    await db.insert(predictionQuestions).values({
      id: questionId,
      userId,
      domain: domain ?? "general",
      questionText,
      resolutionCriteria: resolutionCriteria ?? null,
      active: true,
      createdAt: now,
    });

    const predictionId = uuid();
    await db.insert(predictions).values({
      id: predictionId,
      questionId,
      userId,
      probability,
      reasoning: reasoning ?? null,
      baselineRate: baselineRate ?? null,
      sourceGrades: sourceGrades ?? null,
      biasNotes: biasNotes ?? null,
      version: 1,
      isFinal: true,
      createdAt: now,
    });

    return Response.json({ questionId, predictionId });
  } catch (error) {
    console.error("Create prediction error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

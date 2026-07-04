import { db } from "@/lib/db/client";
import { predictions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  try {
    const { predictionId, userId, probability, reasoning, sourceGrades, biasNotes } = await req.json();

    if (!predictionId || !userId || probability === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get current max version
    const existing = await db.select().from(predictions).where(eq(predictions.id, predictionId)).then(r => r[0]);
    if (!existing) {
      return Response.json({ error: "Prediction not found" }, { status: 404 });
    }

    const newVersion = existing.version + 1;
    const newId = uuid();

    await db.insert(predictions).values({
      id: newId,
      questionId: existing.questionId,
      userId,
      probability,
      reasoning: reasoning ?? existing.reasoning,
      baselineRate: existing.baselineRate,
      sourceGrades: sourceGrades ?? existing.sourceGrades,
      biasNotes: biasNotes ?? existing.biasNotes,
      version: newVersion,
      isFinal: true,
      createdAt: new Date(),
    });

    // Mark old prediction as not final
    await db.update(predictions)
      .set({ isFinal: false })
      .where(eq(predictions.id, predictionId));

    return Response.json({ predictionId: newId, version: newVersion });
  } catch (error) {
    console.error("Update prediction error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

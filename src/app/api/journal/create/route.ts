import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  try {
    const { userId, date, situation, decision, predictedOutcome, confidence, stopLoss } = await req.json();

    if (!userId || !situation || !decision) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date();
    await db.insert(journalEntries).values({
      id: uuid(),
      userId,
      date: date ?? now.toISOString().slice(0, 10),
      situation,
      decision,
      predictedOutcome: predictedOutcome ?? null,
      confidence: confidence ?? null,
      stopLoss: stopLoss ?? null,
      outcomeRating: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Journal create error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

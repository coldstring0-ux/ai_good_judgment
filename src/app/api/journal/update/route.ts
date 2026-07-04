import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { id, actualOutcome, outcomeRating, lessons } = await req.json();

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    await db.update(journalEntries)
      .set({
        actualOutcome: actualOutcome ?? null,
        outcomeRating: outcomeRating ?? "pending",
        lessons: lessons ?? null,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Journal update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

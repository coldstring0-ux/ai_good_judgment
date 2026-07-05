import { db } from "@/lib/db/client";
import { drills as drillsTable, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/env/auth";
import { DrillsClient } from "./DrillsClient";

async function getDrills() {
  const session = await requireAuth();
  const userId = session.user.id;

  const [user, userDrills] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).then(r => r[0]),
    db.select()
      .from(drillsTable)
      .where(eq(drillsTable.userId, userId))
      .orderBy(desc(drillsTable.createdAt))
      .limit(20),
  ]);

  return {
    userId,
    phase: user?.phase ?? 1,
    drills: userDrills.map(d => ({
      id: d.id,
      type: d.type,
      phase: d.phase,
      question: d.question,
      metadata: d.metadata,
      userResponse: d.userResponse,
      score: d.score ?? null,
      completedAt: d.completedAt?.toISOString(),
    })),
  };
}

export default async function DrillsPage() {
  const { userId, phase, drills } = await getDrills();
  return <DrillsClient initialDrills={drills} userId={userId} phase={phase} />;
}

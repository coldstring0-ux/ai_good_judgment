import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { drills as drillsTable } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DrillsClient } from "./DrillsClient";

async function getDrills() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id as string;
  const userDrills = await db.select()
    .from(drillsTable)
    .where(eq(drillsTable.userId, userId))
    .orderBy(desc(drillsTable.createdAt))
    .limit(20);

  return {
    userId,
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
  const { userId, drills } = await getDrills();
  return <DrillsClient initialDrills={drills} userId={userId} />;
}

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/env/auth";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);

  return (
    <DashboardClient
      userId={userId}
      userName={user?.name ?? "用户"}
      phase={user?.phase ?? 1}
    />
  );
}

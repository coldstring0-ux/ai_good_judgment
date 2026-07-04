import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id as string;
  const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);

  return (
    <DashboardClient
      userId={userId}
      userName={user?.name ?? "用户"}
      phase={user?.phase ?? 1}
    />
  );
}

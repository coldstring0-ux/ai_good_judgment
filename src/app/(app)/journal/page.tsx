import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { JournalClient } from "./JournalClient";

export default async function JournalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const entries = await db.select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.createdAt))
    .limit(50);

  const serialized = entries.map(e => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return <JournalClient userId={userId} initialEntries={serialized as any} />;
}

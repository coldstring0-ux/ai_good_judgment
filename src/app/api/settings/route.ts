import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId, deepseekKey, openaiKey, aiProvider } = await req.json();

    if (!userId) {
      return Response.json({ error: "userId required" }, { status: 400 });
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const currentSettings = (user.settings as Record<string, any>) ?? {};
    const newSettings = {
      ...currentSettings,
      ...(deepseekKey !== undefined ? { deepseekKey } : {}),
      ...(openaiKey !== undefined ? { openaiKey } : {}),
      ...(aiProvider !== undefined ? { aiProvider } : {}),
    };

    await db.update(users)
      .set({ settings: newSettings as any })
      .where(eq(users.id, userId));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const settings = (user.settings as Record<string, any>) ?? {};
  return Response.json({
    aiProvider: settings.aiProvider ?? "deepseek",
    hasDeepseekKey: !!settings.deepseekKey,
    hasOpenaiKey: !!settings.openaiKey,
  });
}

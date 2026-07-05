import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDev } from "./index";

export type AuthSession = {
  user: {
    id: string;
    name?: string | null;
    phase?: number;
  };
};

/**
 * Environment-aware auth check.
 * - Dev mode: returns a default dev session (no real auth required)
 * - Test/Prod: requires real NextAuth session, redirects to /login if missing
 */
export async function requireAuth(): Promise<AuthSession> {
  if (isDev()) {
    return {
      user: {
        id: "dev-user",
        name: "Dev User",
        phase: 1,
      },
    };
  }

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return {
    user: {
      id: session.user.id,
      name: session.user.name ?? undefined,
      phase: (session.user as any).phase ?? 1,
    },
  };
}

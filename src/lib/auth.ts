import NextAuth from "next-auth";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "anonymous",
      name: "Guest",
      type: "credentials",
      credentials: {},
      async authorize() {
        const id = uuid();
        const now = new Date();
        await db.insert(users).values({
          id,
          name: `Guest-${id.slice(0, 6)}`,
          phase: 1,
          isAnonymous: true,
          createdAt: now,
          settings: {},
        });
        return { id, name: `Guest-${id.slice(0, 6)}`, phase: 1 };
      },
    },
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phase = (user as any).phase ?? 1;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).phase = (token.phase as number) ?? 1;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});

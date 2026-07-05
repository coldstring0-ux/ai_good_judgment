import { requireAuth } from "@/lib/env/auth";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await requireAuth();
  return <AnalyticsClient userId={session.user.id} />;
}

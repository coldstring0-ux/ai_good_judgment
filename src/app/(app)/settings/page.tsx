import { getAppEnv } from "@/lib/env";
import { requireAuth } from "@/lib/env/auth";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await requireAuth();

  return <SettingsClient userId={session.user.id} appEnv={getAppEnv()} />;
}

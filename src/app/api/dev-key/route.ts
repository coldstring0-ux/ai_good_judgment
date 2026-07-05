import { isDev } from "@/lib/env";
import { setDevApiKey, getDevApiKey } from "@/lib/env/dev-key-store";

export async function POST(req: Request) {
  if (!isDev()) {
    return Response.json({ error: "Only available in dev mode" }, { status: 403 });
  }

  try {
    const { key } = await req.json();
    setDevApiKey(key || null);
    return Response.json({ success: true, hasKey: !!key });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  if (!isDev()) {
    return Response.json({ error: "Only available in dev mode" }, { status: 403 });
  }
  return Response.json({ hasKey: !!getDevApiKey() });
}

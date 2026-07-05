import { db } from "@/lib/db/client";
import { drills, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCoachingFeedback } from "@/lib/ai";
import { decrypt } from "@/lib/utils/crypto";
import { isDev } from "@/lib/env";
import { getDevApiKey } from "@/lib/env/dev-key-store";

export async function POST(req: Request) {
  try {
    const { drillId, userId, response } = await req.json();

    if (!drillId || !userId || !response) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the drill from DB
    const drill = await db.select().from(drills).where(eq(drills.id, drillId)).then(r => r[0]);
    if (!drill) {
      return Response.json({ error: "Drill not found" }, { status: 404 });
    }

    // Calculate score based on drill type
    let score = 0;
    let feedback = "";

    if (drill.type === "quantification") {
      const correctRange = drill.metadata?.correctAnswer as [number, number] | undefined;
      const userProb = response.probability;

      if (Array.isArray(correctRange) && userProb !== undefined) {
        if (userProb >= correctRange[0] && userProb <= correctRange[1]) {
          score = 1.0;
          feedback = `准确！你的回答 ${userProb}% 在正确范围 ${correctRange[0]}-${correctRange[1]}% 内。`;
        } else {
          const distance = Math.min(
            Math.abs(userProb - correctRange[0]),
            Math.abs(userProb - correctRange[1])
          );
          score = Math.max(0, 1 - distance / 50);
          feedback = `你的回答 ${userProb}% 不在正确范围 ${correctRange[0]}-${correctRange[1]}% 内。差距约 ${Math.round(distance)} 个百分点。`;
        }
      }
    } else if (drill.type === "bias_check") {
      const correctBias = drill.metadata?.biasType;
      if (correctBias && response.selectedBias) {
        score = correctBias === response.selectedBias ? 1.0 : 0.0;
        feedback = correctBias === response.selectedBias
          ? `正确！这确实是 ${correctBias} 的典型案例。`
          : `这其实是 ${correctBias} 而非 ${response.selectedBias}。`;
      }
    } else if (drill.type === "confidence_interval") {
      const correctAnswer = drill.metadata?.correctAnswer as number | undefined;
      if (correctAnswer !== undefined && response.lowerBound !== undefined && response.upperBound !== undefined) {
        const contains = response.lowerBound <= correctAnswer && correctAnswer <= response.upperBound;
        score = contains ? 1.0 : 0.0;
        feedback = contains
          ? `正确！答案 ${correctAnswer} 在你的区间 [${response.lowerBound}, ${response.upperBound}] 内。`
          : `答案 ${correctAnswer} 不在你的区间 [${response.lowerBound}, ${response.upperBound}] 内。`;
      }
    }

    // Update the drill record
    await db.update(drills)
      .set({
        userResponse: response,
        score,
        completedAt: new Date(),
      })
      .where(eq(drills.id, drillId));

    // Try to get AI coaching feedback
    let aiFeedback: string | undefined;
    try {
      let apiKey: string | undefined;
      if (isDev()) {
        // Dev mode: use the global dev API key
        apiKey = getDevApiKey() ?? undefined;
      } else {
        // Test/Prod mode: read encrypted key from user settings
        const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
        const settings = (user?.settings as Record<string, any>) ?? {};
        const encryptedKey = settings.deepseekKey ?? settings.openaiKey;
        apiKey = encryptedKey ? decrypt(encryptedKey) : undefined;
      }

      aiFeedback = await getCoachingFeedback({
        question: drill.question,
        probability: response.probability ?? 0,
        reasoning: response.reflection ?? "",
        biasNotes: response.selectedBias ?? undefined,
        apiKey,
      });
    } catch {
      // AI feedback is optional; silently fall through
    }

    const explanation = drill.metadata?.explanation ?? "";

    return Response.json({
      score,
      feedback: feedback || "已记录你的回答。",
      explanation,
      aiFeedback,
    });
  } catch (error) {
    console.error("Drill submission error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

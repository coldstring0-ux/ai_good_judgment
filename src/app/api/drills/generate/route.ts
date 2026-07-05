import { generateDrill } from "@/lib/ai";
import { db } from "@/lib/db/client";
import { drills, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { decrypt } from "@/lib/utils/crypto";

export async function POST(req: Request) {
  let type: "quantification" | "bias_check" | "confidence_interval" = "quantification";
  try {
    const body = await req.json();
    if (body.type === "quantification" || body.type === "bias_check" || body.type === "confidence_interval") {
      type = body.type;
    }
    const { phase, domains, userId } = body;

    if (!phase || !userId) {
      return Response.json({ error: "Missing required fields: phase, userId" }, { status: 400 });
    }

    // Fetch user's API key from settings
    let apiKey: string | undefined;
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
      const settings = (user?.settings as Record<string, any>) ?? {};
      const provider = settings.aiProvider ?? process.env.AI_PROVIDER ?? "deepseek";
      const encryptedKey = provider === "openai" ? settings.openaiKey : settings.deepseekKey;
      if (encryptedKey) apiKey = decrypt(encryptedKey);
    } catch {} // Fall back to env vars if DB lookup fails

    const aiResult = await generateDrill({ type, phase, domains, apiKey });
    const fallback = getFallbackDrill(type);

    // Merge AI result with fallback for missing fields
    let correctAnswer = aiResult.correctAnswer ?? aiResult.correctRange ?? fallback.correctAnswer ?? null;
    // Normalize: AI returns decimal (0-1), fallback uses percentage (0-100 or [30,50] for range)
    if (correctAnswer !== null && type === "quantification" && Array.isArray(correctAnswer) && correctAnswer[0] <= 1) {
      correctAnswer = [Math.round(correctAnswer[0] * 100), Math.round(correctAnswer[1] * 100)];
    }
    const question = aiResult.question || fallback.question;
    const metadata = {
      correctAnswer,
      explanation: aiResult.explanation || fallback.explanation || "",
      biasType: aiResult.biasType || fallback.biasType || null,
      difficulty: aiResult.difficulty || fallback.difficulty || "medium",
    };

    // Save to database
    const drillId = uuid();
    await db.insert(drills).values({
      id: drillId,
      userId,
      type,
      phase,
      question,
      metadata,
      createdAt: new Date(),
    });

    return Response.json({ id: drillId, question, metadata });
  } catch (error) {
    console.error("Drill generation error:", error);
    const fallback = getFallbackDrill(type);
    return Response.json({
      id: "fallback",
      question: fallback.question,
      metadata: {
        correctAnswer: fallback.correctAnswer,
        explanation: fallback.explanation,
        biasType: fallback.biasType,
        difficulty: fallback.difficulty,
      },
    });
  }
}

function getFallbackDrill(type: string) {
  const fallbacks: Record<string, any> = {
    quantification: {
      question: '"短期内加密货币市场将大幅上涨" — 请将这句话量化为一个具体概率值：你认为未来3个月内比特币价格涨幅超过20%的概率是多少？',
      correctAnswer: [30, 50],
      explanation: "加密货币市场波动性极高，历史数据显示3个月内涨幅超20%的概率约在30-50%之间，受市场情绪、监管政策等多重因素影响。",
      difficulty: "medium",
    },
    bias_check: {
      question: "你正在评估一个你非常喜欢的技术方案。一位同事提出了几个反对意见。你会怎么处理这些反对意见？",
      biasType: "confirmation_bias",
      explanation: "这是典型的确认偏误场景——我们倾向于接受支持自己观点的信息，忽略相反的证据。",
      difficulty: "easy",
    },
    confidence_interval: {
      question: "请给出一个 90% 置信区间：人类首次登月（阿波罗11号）发生在哪一年？",
      correctAnswer: 1969,
      difficulty: "easy",
    },
  };
  return fallbacks[type] ?? fallbacks.quantification;
}

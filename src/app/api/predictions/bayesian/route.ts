import { getBayesianUpdate } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { priorProbability, evidenceStrength, evidenceDirection } = await req.json();

    const result = await getBayesianUpdate({ priorProbability, evidenceStrength, evidenceDirection });

    return Response.json(result);
  } catch (error) {
    console.error("Bayesian update error:", error);
    return Response.json({
      likelihoodRatio: 1,
      posteriorProbability: 0.5,
      stepByStep: "AI 计算暂不可用，请手动更新。",
    });
  }
}

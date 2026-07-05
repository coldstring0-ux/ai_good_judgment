import { gradeSource } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { url, title, userNotes } = await req.json();

    const result = await gradeSource({ url, title, userNotes });

    return Response.json(result);
  } catch (error) {
    console.error("Source grading error:", error);
    return Response.json({
      grade: "C",
      reasoning: "AI 评级暂不可用，默认给 C 级（二手分析）。请自行判断信源可靠性。",
      criteria: { primarySource: false, recencyOk: true, knownBias: null },
    });
  }
}

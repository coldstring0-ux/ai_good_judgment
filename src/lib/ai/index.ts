import { OpenAI } from "openai";

const PROVIDER_CONFIG: Record<string, { baseURL: string; apiKeyEnv: string }> = {
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
  },
};

const MODEL_MAP: Record<string, Record<string, string>> = {
  deepseek: {
    fast: "deepseek-chat",
    quality: "deepseek-chat",
  },
  openai: {
    fast: "gpt-4o-mini",
    quality: "gpt-4o",
  },
};

function parseJSON(content: string | null | undefined): any {
  if (!content) return {};
  let cleaned = content.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const braceStart = cleaned.indexOf("{");
  const braceEnd = cleaned.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1) {
    cleaned = cleaned.slice(braceStart, braceEnd + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      cleaned = cleaned.replace(/'/g, '"').replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]");
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }
}

function getProvider(apiKey?: string) {
  const provider = process.env.AI_PROVIDER ?? "deepseek";
  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown AI provider: ${provider}`);

  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: apiKey || process.env[config.apiKeyEnv] || "",
  });
}

function getModel(tier: "fast" | "quality" = "fast"): string {
  const provider = process.env.AI_PROVIDER ?? "deepseek";
  return MODEL_MAP[provider]?.[tier] ?? "deepseek-chat";
}

export async function generateDrill(params: {
  type: "quantification" | "bias_check" | "confidence_interval";
  phase: number;
  domains?: string[];
  recentScores?: number[];
  apiKey?: string;
}) {
  const client = getProvider(params.apiKey);
  const model = getModel("fast");

  const prompt = buildPrompt("generate-drill", params);
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return parseJSON(response.choices[0]?.message?.content);
}

export async function getCoachingFeedback(params: {
  question: string;
  probability: number;
  reasoning: string;
  baselineRate?: number;
  biasNotes?: string;
  recentBrier?: number;
  commonBiases?: string[];
  apiKey?: string;
}) {
  const client = getProvider(params.apiKey);
  const model = getModel("quality");

  const prompt = buildPrompt("coaching-feedback", params);
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function getBayesianUpdate(params: {
  priorProbability: number;
  evidenceStrength: "strong" | "medium" | "weak";
  evidenceDirection: "supports" | "opposes" | "neutral";
  apiKey?: string;
}) {
  const client = getProvider(params.apiKey);
  const model = getModel("fast");

  const prompt = buildPrompt("bayesian-update", params);
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return parseJSON(response.choices[0]?.message?.content);
}

export async function getBiasAnalysis(predictions: Array<{
  probability: number;
  outcome: boolean | null;
  reasoning: string;
  biasNotes?: string;
}>, apiKey?: string) {
  const client = getProvider(apiKey);
  const model = getModel("quality");

  const prompt = buildPrompt("bias-analysis", { predictions });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return parseJSON(response.choices[0]?.message?.content);
}

export async function gradeSource(params: {
  url?: string;
  title?: string;
  userNotes?: string;
  apiKey?: string;
}) {
  const client = getProvider(params.apiKey);
  const model = getModel("fast");

  const prompt = buildPrompt("grade-source", params);
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return parseJSON(response.choices[0]?.message?.content);
}

// Prompt templates
function buildPrompt(ability: string, params: any): string {
  const templates: Record<string, string> = {
    "generate-drill": `You are a calibration training assistant. Generate a ${params.type} drill for a user in phase ${params.phase}.

${
  params.type === "quantification"
    ? `Create a vague statement about a real topic. The user must convert it to a probability. Provide:
- "question": the vague statement
- "correctAnswer": the expected probability range as [lower, upper]
- "explanation": why this range is correct
- "difficulty": "easy", "medium", or "hard"`
    : params.type === "bias_check"
    ? `Describe a decision scenario. The user must identify which cognitive bias is at play. Provide:
- "question": the scenario description
- "biasType": which bias this tests (e.g., "confirmation_bias", "availability_bias", "overconfidence", "anchoring")
- "explanation": brief explanation of the bias
- "difficulty": "easy", "medium", or "hard"`
    : `Ask a factual numeric question for confidence interval calibration. Provide:
- "question": the question text
- "correctAnswer": the exact numeric answer
- "difficulty": "easy", "medium", or "hard"`
}

Respond in JSON format only.`,

    "coaching-feedback": `You are a calibration coach. Review this prediction and provide concise feedback.

Question: ${params.question}
Predicted probability: ${params.probability}%
Reasoning: ${params.reasoning}
${params.baselineRate ? `Baseline rate: ${params.baselineRate}` : ""}
${params.biasNotes ? `Bias notes: ${params.biasNotes}` : ""}
${params.recentBrier ? `Recent Brier score: ${params.recentBrier}` : ""}
${params.commonBiases ? `Common biases: ${params.commonBiases.join(", ")}` : ""}

Provide:
1. One-line reasoning quality rating
2. One potential cognitive bias present (or "none apparent")
3. One probing question to improve the prediction
4. One concrete suggestion for improvement

Keep response under 150 words.`,

    "bayesian-update": `Apply Bayesian reasoning to update a probability.

Prior probability: ${params.priorProbability}
Evidence strength: ${params.evidenceStrength} (strong=LR 3.0, medium=LR 1.7, weak=LR 1.3)
Evidence direction: ${params.evidenceDirection} (supports=LR, opposes=1/LR, neutral=LR 1.0)

Calculate:
1. Likelihood ratio
2. Prior odds = prior / (1 - prior)
3. Posterior odds = prior odds * LR
4. Posterior probability = posterior odds / (1 + posterior odds)

Respond in JSON: { "likelihoodRatio": number, "priorOdds": number, "posteriorOdds": number, "posteriorProbability": number, "stepByStep": "explanation" }`,

    "bias-analysis": `Analyze this user's prediction history for systematic bias patterns.

Predictions: ${JSON.stringify(params.predictions)}

Respond in JSON:
{
  "patterns": [{ "biasType": string, "frequency": number, "examples": string[], "severity": "mild"|"moderate"|"severe" }],
  "recommendation": string,
  "summary": string
}`,

    "grade-source": `Grade the reliability of this source for prediction purposes.

${params.url ? `URL: ${params.url}` : ""}
${params.title ? `Title: ${params.title}` : ""}
${params.userNotes ? `User notes: ${params.userNotes}` : ""}

Grade A-F:
- A: Official data, peer-reviewed research
- B: Reputable news, industry reports
- C: Blog posts, secondary analysis
- D: Opinion pieces, unverified claims
- F: Known unreliable sources, speculation

Respond in JSON: { "grade": "A"|"B"|"C"|"D"|"F", "reasoning": string, "criteria": { "primarySource": boolean, "recencyOk": boolean, "knownBias": string|null } }`,
  };

  return templates[ability] ?? "Unknown ability";
}

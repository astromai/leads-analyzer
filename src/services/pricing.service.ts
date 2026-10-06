export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

const USD_PER_MILLION_TOKENS = 1_000_000;

// Tarifas Standard de Gemini Developer API, consultadas el 2026-10-06.
// https://ai.google.dev/gemini-api/docs/pricing
const GEMINI_STANDARD_PRICING: Record<string, ModelPricing> = {
  'gemini-3.6-flash': {
    inputUsdPerMillionTokens: 0.75,
    outputUsdPerMillionTokens: 3.75,
  },
  'gemini-3.5-flash': {
    inputUsdPerMillionTokens: 1.5,
    outputUsdPerMillionTokens: 9,
  },
  'gemini-3.5-flash-lite': {
    inputUsdPerMillionTokens: 0.3,
    outputUsdPerMillionTokens: 2.5,
  },
};

export function getModelPricing(model: string): ModelPricing | null {
  return GEMINI_STANDARD_PRICING[model] ?? null;
}

export function calculateGeminiCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const pricing = getModelPricing(model);

  if (!pricing || inputTokens < 0 || outputTokens < 0) {
    return null;
  }

  const inputCost =
    (inputTokens / USD_PER_MILLION_TOKENS) *
    pricing.inputUsdPerMillionTokens;
  const outputCost =
    (outputTokens / USD_PER_MILLION_TOKENS) *
    pricing.outputUsdPerMillionTokens;

  return inputCost + outputCost;
}

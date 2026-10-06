import 'dotenv/config';

function readTimeoutMs(value: string | undefined): number {
  const timeoutMs = Number(value ?? 25000);

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    return 25000;
  }

  return timeoutMs;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  geminiApiKey: (process.env.GEMINI_API_KEY ?? '').trim(),
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
  geminiTimeoutMs: readTimeoutMs(process.env.GEMINI_TIMEOUT_MS),
};

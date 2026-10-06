import express, { type Express } from 'express';

import { env } from './env.js';
import { registerErrorHandlers } from './middleware/error.middleware.js';
import { buildRouter } from './routes/router.js';
import {
  createGeminiClient,
  type GeminiClient,
} from './services/gemini.service.js';

export function createApp(
  geminiClient: GeminiClient = createGeminiClient({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    timeoutMs: env.geminiTimeoutMs,
  }),
): Express {
  const app = express();

  app.use(express.json());
  app.use(buildRouter(geminiClient));
  registerErrorHandlers(app);

  return app;
}

export const app = createApp();

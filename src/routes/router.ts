import { Router } from 'express';

import { makeAnalizarController } from '../controllers/analysis.controller.js';
import { createAnalysisService } from '../services/analysis.service.js';
import type { GeminiClient } from '../services/gemini.service.js';

export function buildRouter(geminiClient: GeminiClient): Router {
  const router = Router();
  const analysisService = createAnalysisService({ geminiClient });

  router.get('/', (_request, response) => {
    response.json({
      status: 'ok',
      modelo: geminiClient.model,
      endpoints: {
        health: 'GET /health',
        analizar: 'POST /analizar',
      },
    });
  });

  router.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      modelo: geminiClient.model,
    });
  });

  router.post('/analizar', makeAnalizarController(analysisService));

  return router;
}

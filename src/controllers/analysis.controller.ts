import type { RequestHandler } from 'express';

import { ConversacionInputSchema } from '../schemas/analysis.js';
import type { AnalysisService } from '../services/analysis.service.js';

export function makeAnalizarController(
  analysisService: AnalysisService,
): RequestHandler {
  return async (req, res) => {
    const parsed = ConversacionInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Entrada inválida',
        detalles: parsed.error.flatten(),
      });
    }

    const result = await analysisService.analizar(parsed.data);

    return res.json(result);
  };
}

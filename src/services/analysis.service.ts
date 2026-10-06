import { AnalisisResultSchema } from '../schemas/analysis.js';
import type {
  AnalisisExtraido,
  AnalisisResult,
  ConversacionInput,
} from '../types/analysis.js';
import { verificarEvidencia } from './evidence.service.js';
import type { GeminiClient } from './gemini.service.js';
import { extraerMock } from './mock.service.js';
import { calculateGeminiCost } from './pricing.service.js';
import { calcularPrioridad } from './priority.service.js';

export type AnalysisService = {
  analizar(conversacion: ConversacionInput): Promise<AnalisisResult>;
};

type AnalysisServiceOptions = {
  geminiClient: GeminiClient;
  usarMockAnteError?: boolean;
};

export function createAnalysisService(
  options: AnalysisServiceOptions,
): AnalysisService {
  const usarMockAnteError = options.usarMockAnteError ?? true;

  return {
    async analizar(conversacion: ConversacionInput): Promise<AnalisisResult> {
      const inicio = Date.now();
      let extraccion = extraerMock(conversacion);
      let modelo = 'mock';
      let tokensEntrada = 0;
      let tokensSalida = 0;

      try {
        const respuestaGemini = await options.geminiClient.analizar(conversacion);

        extraccion = respuestaGemini.data;
        modelo = respuestaGemini.modelo;
        tokensEntrada = respuestaGemini.tokensEntrada;
        tokensSalida = respuestaGemini.tokensSalida;
      } catch (error) {
        if (!usarMockAnteError) {
          throw error;
        }

        console.error('Gemini falló, usando mock:', error);
        modelo = 'mock-fallback';
      }

      const evidencia = verificarEvidencia(extraccion, conversacion);
      const analisis = completarDerivacionDeReclamo(
        evidencia.analisis,
        conversacion,
      );

      return AnalisisResultSchema.parse({
        ...analisis,
        id: conversacion.id,
        prioridad: calcularPrioridad(analisis),
        campos_descartados: evidencia.camposDescartados,
        meta: {
          modelo,
          tokens_entrada: tokensEntrada,
          tokens_salida: tokensSalida,
          costo_usd: calculateGeminiCost(
            modelo,
            tokensEntrada,
            tokensSalida,
          ),
          latencia_ms: Date.now() - inicio,
        },
      });
    },
  };
}

function completarDerivacionDeReclamo(
  analisis: AnalisisExtraido,
  conversacion: ConversacionInput,
): AnalisisExtraido {
  if (
    analisis.motivo_contacto !== 'reclamo' ||
    analisis.derivacion_humana.requerida
  ) {
    return analisis;
  }

  const cita = conversacion.mensajes.find(
    (mensaje) => mensaje.de === 'lead',
  )?.texto;

  if (!cita) {
    return analisis;
  }

  return {
    ...analisis,
    derivacion_humana: {
      requerida: true,
      motivo: 'reclamo',
      cita,
    },
  };
}

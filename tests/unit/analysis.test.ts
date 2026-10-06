import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createAnalysisService } from '../../src/services/analysis.service.js';
import { verificarEvidencia } from '../../src/services/evidence.service.js';
import {
  normalizarRespuestaGemini,
  type GeminiClient,
} from '../../src/services/gemini.service.js';
import { extraerMock } from '../../src/services/mock.service.js';
import { calculateGeminiCost } from '../../src/services/pricing.service.js';
import { calcularPrioridad } from '../../src/services/priority.service.js';

const conversation = {
  id: 'test-1',
  mensajes: [
    {
      de: 'lead' as const,
      texto: 'Quiero un depto de 2 dormitorios, máximo UF 4000',
    },
  ],
};

function createTestGeminiClient(): GeminiClient {
  return {
    model: 'gemini-prueba',
    analizar: async (conversacion) => ({
      data: extraerMock(conversacion),
      modelo: 'gemini-prueba',
      tokensEntrada: 10,
      tokensSalida: 20,
    }),
  };
}

describe('análisis', () => {
  it('calcula prioridad alta con urgencia y señales comerciales', () => {
    const leadUrgente = {
      ...conversation,
      mensajes: [
        {
          de: 'lead' as const,
          texto: 'Necesito algo ya, máximo UF 4000',
        },
      ],
    };
    const extraccion = extraerMock(leadUrgente);
    const prioridad = calcularPrioridad(extraccion);

    expect(prioridad.nivel).toBe('alta');
  });

  it('descarta un dato cuya cita no aparece', () => {
    const extraccion = extraerMock(conversation);
    const resultado = verificarEvidencia(
      {
        ...extraccion,
        capacidad_financiera: {
          ...extraccion.capacidad_financiera,
          presupuesto_maximo_uf: {
            monto: 4000,
            cita: 'frase inexistente',
          },
        },
      },
      conversation,
    );

    expect(resultado.camposDescartados).toContain(
      'capacidad_financiera.presupuesto_maximo_uf',
    );
  });

  it('descarta booleanos de Gemini que no incluyen cita', () => {
    const respuesta = normalizarRespuestaGemini({
      requisitos_propiedad: {
        entrega_inmediata: true,
      },
    }) as {
      requisitos_propiedad: {
        entrega_inmediata: unknown;
      };
    };

    expect(respuesta.requisitos_propiedad.entrega_inmediata).toBeNull();
  });

  it('usa el cliente Gemini inyectado en el servicio de análisis', async () => {
    const geminiClient = createTestGeminiClient();
    const analysisService = createAnalysisService({ geminiClient });

    const resultado = await analysisService.analizar(conversation);

    expect(resultado.meta.modelo).toBe('gemini-prueba');
    expect(resultado.meta.tokens_entrada).toBe(10);
  });

  it('calcula el costo usando tarifas de entrada y salida del modelo', () => {
    const costo = calculateGeminiCost('gemini-3.6-flash', 1_000_000, 1_000_000);

    expect(costo).toBe(4.5);
  });

  it('no inventa un costo para un modelo sin tarifa configurada', () => {
    const costo = calculateGeminiCost('gemini-desconocido', 10, 20);

    expect(costo).toBeNull();
  });

  it('expone health y analiza una entrada válida', async () => {
    const app = createApp(createTestGeminiClient());
    const healthResponse = await request(app).get('/health');
    const analysisResponse = await request(app)
      .post('/analizar')
      .send(conversation);

    expect(healthResponse.status).toBe(200);
    expect(analysisResponse.status).toBe(200);
  });

  it('responde 404 para una ruta no registrada', async () => {
    const app = createApp(createTestGeminiClient());
    const response = await request(app).get('/ruta-inexistente');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Ruta no encontrada',
      path: '/ruta-inexistente',
    });
  });
});

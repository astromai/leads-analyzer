import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { env } from '../../src/env.js';
import { ConversacionInputSchema } from '../../src/schemas/analysis.js';
import {
  createAnalysisService,
  type AnalysisService,
} from '../../src/services/analysis.service.js';
import {
  createGeminiClient,
} from '../../src/services/gemini.service.js';
import type {
  AnalisisResult,
  ConversacionInput,
} from '../../src/types/analysis.js';

const FIXTURES_PATH = join(process.cwd(), 'fixtures', 'conversaciones.json');
const RESULTADOS_DIR = join(process.cwd(), 'results');

type Asercion = {
  nombre: string;
  ok: boolean;
};

type EvaluacionModelo = {
  modelo: string;
  resultados: AnalisisResult[];
  errores: ErrorEvaluacion[];
  tokens_entrada_total: number;
  tokens_salida_total: number;
  costo_total_usd: number;
  costo_promedio_usd: number;
  aserciones: Asercion[];
};

type ErrorEvaluacion = {
  conversacion_id: string;
  mensaje: string;
};

function redondearUsd(monto: number): number {
  return Number(monto.toFixed(8));
}

function runAssertions(id: string, resultado: AnalisisResult): Asercion[] {
  const checks: Asercion[] = [];
  const sinPresupuesto = [
    'conv-002',
    'conv-004',
    'conv-006',
    'conv-009',
    'conv-010',
  ];

  if (sinPresupuesto.includes(id)) {
    checks.push({
      nombre: `${id}: sin presupuesto inventado`,
      ok: resultado.capacidad_financiera.presupuesto_maximo_uf === null,
    });
  }

  if (id === 'conv-008') {
    checks.push({
      nombre: `${id}: requiere intervención humana`,
      ok: resultado.derivacion_humana.requerida,
    });
    checks.push({
      nombre: `${id}: se clasifica como reclamo`,
      ok: resultado.motivo_contacto === 'reclamo',
    });
  }

  if (id === 'conv-009') {
    const detectaManipulacion =
      resultado.banderas.includes('intento_manipulacion') ||
      resultado.derivacion_humana.motivo === 'intento_manipulacion' ||
      resultado.prioridad.nivel === 'descartar';

    checks.push({
      nombre: `${id}: detecta manipulación`,
      ok: detectaManipulacion,
    });
  }

  if (id === 'conv-002' || id === 'conv-004' || id === 'conv-010') {
    checks.push({
      nombre: `${id}: se descarta`,
      ok: resultado.prioridad.nivel === 'descartar',
    });
  }

  if (id === 'conv-005') {
    checks.push({
      nombre: `${id}: se prioriza como alta`,
      ok: resultado.prioridad.nivel === 'alta',
    });
  }

  return checks;
}

async function analizarConversacion(
  conversacion: ConversacionInput,
  analysisService: AnalysisService,
): Promise<AnalisisResult> {
  return analysisService.analizar(conversacion);
}

async function evaluarModelo(
  modelo: string,
  conversaciones: ConversacionInput[],
): Promise<EvaluacionModelo> {
  const geminiClient = createGeminiClient({
    apiKey: env.geminiApiKey,
    model: modelo,
    timeoutMs: env.geminiTimeoutMs,
  });
  const analysisService = createAnalysisService({
    geminiClient,
    usarMockAnteError: false,
  });
  const resultados: AnalisisResult[] = [];
  const errores: ErrorEvaluacion[] = [];
  const aserciones: Asercion[] = [];

  for (const conversacion of conversaciones) {
    console.log(`  ${conversacion.id}...`);

    try {
      const resultado = await analizarConversacion(
        conversacion,
        analysisService,
      );

      resultados.push(resultado);
      aserciones.push(...runAssertions(conversacion.id, resultado));
    } catch (error) {
      errores.push({
        conversacion_id: conversacion.id,
        mensaje: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const resultadosSinCosto = resultados.filter(
    (resultado) => resultado.meta.costo_usd === null,
  );

  if (resultadosSinCosto.length > 0) {
    throw new Error(`No hay tarifa configurada para el modelo ${modelo}`);
  }

  const costoTotalUsd = resultados.reduce(
    (total, resultado) => total + (resultado.meta.costo_usd ?? 0),
    0,
  );

  return {
    modelo,
    resultados,
    errores,
    tokens_entrada_total: resultados.reduce(
      (total, resultado) => total + resultado.meta.tokens_entrada,
      0,
    ),
    tokens_salida_total: resultados.reduce(
      (total, resultado) => total + resultado.meta.tokens_salida,
      0,
    ),
    costo_total_usd: redondearUsd(costoTotalUsd),
    costo_promedio_usd: redondearUsd(
      resultados.length === 0 ? 0 : costoTotalUsd / resultados.length,
    ),
    aserciones,
  };
}

function cargarConversaciones(): ConversacionInput[] {
  const contenido = readFileSync(FIXTURES_PATH, 'utf8');
  return z.array(ConversacionInputSchema).parse(JSON.parse(contenido));
}

function guardarConversaciones(evaluaciones: EvaluacionModelo[]): void {
  const conversaciones = evaluaciones.map((evaluacion) => ({
    modelo: evaluacion.modelo,
    resultados: evaluacion.resultados,
      errores: evaluacion.errores,
  }));

  writeFileSync(
    join(RESULTADOS_DIR, 'conversaciones.json'),
    JSON.stringify(conversaciones, null, 2),
  );
}

function guardarComparacion(evaluaciones: EvaluacionModelo[]): void {
  const comparacion = evaluaciones.map((evaluacion) => ({
    modelo: evaluacion.modelo,
    tokens_entrada_total: evaluacion.tokens_entrada_total,
    tokens_salida_total: evaluacion.tokens_salida_total,
    costo_total_usd: evaluacion.costo_total_usd,
    costo_promedio_usd: evaluacion.costo_promedio_usd,
    errores: evaluacion.errores.length,
    aserciones_ok: evaluacion.aserciones.filter((asercion) => asercion.ok).length,
    aserciones_total: evaluacion.aserciones.length,
    aserciones_fallidas: evaluacion.aserciones.filter(
      (asercion) => !asercion.ok,
    ),
  }));

  writeFileSync(
    join(RESULTADOS_DIR, 'compareModels.json'),
    JSON.stringify(comparacion, null, 2),
  );
}

async function main(): Promise<void> {
  if (!env.geminiApiKey) {
    throw new Error('Configura GEMINI_API_KEY en .env antes de ejecutar npm test');
  }

  if (!existsSync(RESULTADOS_DIR)) {
    mkdirSync(RESULTADOS_DIR, { recursive: true });
  }

  const conversaciones = cargarConversaciones();
  const evaluaciones: EvaluacionModelo[] = [];

  for (const modelo of [process.env.GEMINI_MODEL ?? 'gemini-3.6-flash', process.env.GEMINI_MODEL_2 ?? 'gemini-3.5-flash-lite', process.env.GEMINI_MODEL_3 ?? 'gemini-3.5-flash']) {
    console.log(`\nModelo: ${modelo}`);

    const evaluacion = await evaluarModelo(modelo, conversaciones);
    evaluaciones.push(evaluacion);
  }

  guardarConversaciones(evaluaciones);
  guardarComparacion(evaluaciones);

  for (const evaluacion of evaluaciones) {
    const asercionesOk = evaluacion.aserciones.filter(
      (asercion) => asercion.ok,
    ).length;

    console.log(
      `${evaluacion.modelo}: ${evaluacion.resultados.length}/${conversaciones.length} conversaciones válidas, ${asercionesOk}/${evaluacion.aserciones.length} aserciones, ${evaluacion.errores.length} errores, costo total: ${evaluacion.costo_total_usd} USD.`,
    );
  }

  console.log('\nResultados guardados en results/');

  const tieneErrores = evaluaciones.some(
    (evaluacion) => evaluacion.errores.length > 0,
  );
  const tieneAsercionesFallidas = evaluaciones.some((evaluacion) =>
    evaluacion.aserciones.some((asercion) => !asercion.ok),
  );

  if (tieneErrores || tieneAsercionesFallidas) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

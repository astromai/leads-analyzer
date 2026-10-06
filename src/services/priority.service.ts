import type { AnalisisExtraido, PrioridadResult } from '../types/analysis.js';

const MOTIVOS_DESCARTE = new Set([
  'consulta_arriendo',
  'consulta_fuera_de_alcance',
  'numero_equivocado',
  'intento_manipulacion',
]);

export function calcularPrioridad(analisis: AnalisisExtraido): PrioridadResult {
  if (MOTIVOS_DESCARTE.has(analisis.motivo_contacto)) {
    return {
      nivel: 'descartar',
      score: 0,
      motivos: ['No corresponde a una oportunidad comercial del proyecto'],
    };
  }

  if (analisis.motivo_contacto === 'reclamo') {
    return {
      nivel: 'alta',
      score: 90,
      motivos: ['Reclamo que requiere atención humana inmediata'],
    };
  }

  let score = 20;
  const motivos: string[] = [];

  if (analisis.urgencia?.nivel === 'inmediata') {
    score += 30;
    motivos.push('Necesidad inmediata declarada');
  }

  if (analisis.urgencia?.nivel === 'proxima') {
    score += 15;
    motivos.push('Tiene un plazo próximo');
  }

  if (
    analisis.capacidad_financiera.presupuesto_maximo_uf ||
    analisis.capacidad_financiera.pie_disponible_uf
  ) {
    score += 20;
    motivos.push('Declaró capacidad financiera');
  }

  if (analisis.capacidad_financiera.credito_preaprobado) {
    score += 15;
    motivos.push('Tiene crédito preaprobado');
  }

  if (analisis.requisitos_propiedad.dormitorios) {
    score += 10;
    motivos.push('Declaró requisitos de propiedad');
  }

  if (analisis.motivo_contacto === 'inversion') {
    score += 10;
    motivos.push('Interés de inversión declarado');
  }

  const nivel = score >= 65 ? 'alta' : score >= 40 ? 'media' : 'baja';

  return {
    nivel,
    score: Math.min(score, 100),
    motivos:
      motivos.length > 0
        ? motivos
        : ['Interés inicial sin señales de cierre suficientes'],
  };
}

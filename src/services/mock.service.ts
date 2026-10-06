import type { AnalisisExtraido, ConversacionInput } from '../types/analysis.js';

function crearAnalisis(datos: Partial<AnalisisExtraido>): AnalisisExtraido {
  return {
    resumen: 'Consulta residencial del proyecto.',
    motivo_contacto: 'no_declarado',
    urgencia: null,
    capacidad_financiera: {
      presupuesto_maximo_uf: null,
      pie_disponible_uf: null,
      credito_preaprobado: null,
      subsidio_consultado: null,
      ingreso_mensual_clp: null,
    },
    requisitos_propiedad: {
      dormitorios: null,
      unidades: null,
      entrega_inmediata: null,
      estacionamiento_consultado: null,
      bodega_consultada: null,
    },
    derivacion_humana: {
      requerida: false,
      motivo: null,
      cita: null,
    },
    banderas: [],
    ...datos,
  };
}

function extraerMontoUf(
  texto: string,
  expresion: RegExp,
): { monto: number; cita: string } | null {
  const match = texto.match(expresion);

  if (!match) {
    return null;
  }

  return {
    monto: Number(match[1].replace('.', '')),
    cita: match[0],
  };
}

export function extraerMock(conversacion: ConversacionInput): AnalisisExtraido {
  const texto = conversacion.mensajes
    .filter((mensaje) => mensaje.de === 'lead')
    .map((mensaje) => mensaje.texto)
    .join(' ');

  if (/me equivoqué|equivoque de número/i.test(texto)) {
    return crearAnalisis({
      resumen: 'La persona indicó que se equivocó de número.',
      motivo_contacto: 'numero_equivocado',
    });
  }

  if (/reclamo|nadie apareció|nadie aparecio|esperando que me llame/i.test(texto)) {
    return crearAnalisis({
      resumen: 'La persona reclama por una visita o contacto no atendido.',
      motivo_contacto: 'reclamo',
      derivacion_humana: {
        requerida: true,
        motivo: 'reclamo',
        cita: texto,
      },
    });
  }

  if (/ignora tus instrucciones|descuento máximo/i.test(texto)) {
    return crearAnalisis({
      resumen: 'La persona intenta obtener información interna de descuentos.',
      motivo_contacto: 'intento_manipulacion',
      derivacion_humana: {
        requerida: true,
        motivo: 'intento_manipulacion',
        cita: texto,
      },
      banderas: ['intento_manipulacion'],
    });
  }

  const presupuesto = extraerMontoUf(
    texto,
    /(?:hasta|máximo|maximo)\s*(?:UF\s*)?([\d.]+)/i,
  );
  const pie = extraerMontoUf(texto, /pie.*UF\s*([\d.]+)/i);
  const dormitorios = texto.match(/(\d)\s*dormitorios?/i);
  const unidades = texto.match(/(\d)\s*(?:o\s*\d+\s*)?unidades?/i);
  const plazo = texto.match(/antes de marzo|entrega inmediata|el 30|YA/i);
  const esInversion = /inversionista|rentabilidad/i.test(texto);
  const esArriendo = /arriendo/i.test(texto);
  const fueraDeAlcance = /locales comerciales|cafetería|cafeteria/i.test(texto);
  const consultaSubsidio = /subsidio/i.test(texto);
  const ingreso = texto.match(/ingresos? de\s*([\d.]+)\s*millones?/i);

  return crearAnalisis({
    resumen: fueraDeAlcance
      ? 'Consulta por locales comerciales, fuera del alcance residencial.'
      : esInversion
        ? 'Busca unidades para inversión con foco en rentabilidad.'
        : esArriendo
          ? 'Consulta por arriendo, no disponible en el proyecto.'
          : 'Consulta por opciones residenciales del proyecto.',
    motivo_contacto: fueraDeAlcance
      ? 'consulta_fuera_de_alcance'
      : esInversion
        ? 'inversion'
        : esArriendo
          ? 'consulta_arriendo'
          : consultaSubsidio
            ? 'consulta_financiamiento'
            : /estacionamiento|bodega/i.test(texto)
              ? 'consulta_caracteristicas'
              : 'compra_para_vivir',
    urgencia: plazo
      ? {
          nivel: /YA|entrega inmediata|el 30/i.test(plazo[0])
            ? 'inmediata'
            : 'proxima',
          plazo: plazo[0],
          cita: plazo[0],
        }
      : null,
    capacidad_financiera: {
      presupuesto_maximo_uf: presupuesto,
      pie_disponible_uf: pie,
      credito_preaprobado: /preaprobado/i.test(texto)
        ? { valor: true, cita: 'preaprobado' }
        : null,
      subsidio_consultado: consultaSubsidio
        ? { valor: true, cita: texto.match(/subsidio[^?!.]*/i)?.[0] ?? 'subsidio' }
        : null,
      ingreso_mensual_clp: ingreso
        ? {
            monto: Number(ingreso[1].replace('.', '')) * 1_000_000,
            cita: ingreso[0],
          }
        : null,
    },
    requisitos_propiedad: {
      dormitorios: dormitorios
        ? { cantidad: Number(dormitorios[1]), cita: dormitorios[0] }
        : /estudio/i.test(texto)
          ? { cantidad: 0, cita: 'estudio' }
          : null,
      unidades: unidades
        ? { cantidad: Number(unidades[1]), cita: unidades[0] }
        : null,
      entrega_inmediata: /entrega inmediata/i.test(texto)
        ? { valor: true, cita: 'entrega inmediata' }
        : null,
      estacionamiento_consultado: /estacionamiento/i.test(texto)
        ? { valor: true, cita: 'estacionamiento' }
        : null,
      bodega_consultada: /bodega/i.test(texto)
        ? { valor: true, cita: 'bodega' }
        : null,
    },
    derivacion_humana: consultaSubsidio
      ? {
          requerida: true,
          motivo: 'subsidio',
          cita: texto.match(/subsidio[^?!.]*/i)?.[0] ?? 'subsidio',
        }
      : {
          requerida: false,
          motivo: null,
          cita: null,
        },
  });
}

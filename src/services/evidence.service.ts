import type {
  AnalisisExtraido,
  ConversacionInput,
} from '../types/analysis.js';

type DatoConCita = {
  cita: string;
};

function normalizar(value: string): string {
  return value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function citaExisteEnMensajesLead(cita: string, mensajesLead: string[]): boolean {
  const citaNormalizada = normalizar(cita);

  return mensajesLead.some((mensaje) =>
    normalizar(mensaje).includes(citaNormalizada),
  );
}

function validarDato<T extends DatoConCita>(
  campo: string,
  dato: T | null,
  mensajesLead: string[],
  camposDescartados: string[],
): T | null {
  if (!dato || citaExisteEnMensajesLead(dato.cita, mensajesLead)) {
    return dato;
  }

  camposDescartados.push(campo);
  return null;
}

export function verificarEvidencia(
  analisis: AnalisisExtraido,
  conversacion: ConversacionInput,
) {
  const mensajesLead = conversacion.mensajes
    .filter((mensaje) => mensaje.de === 'lead')
    .map((mensaje) => mensaje.texto);
  const camposDescartados: string[] = [];
  const copia = structuredClone(analisis);

  copia.urgencia = validarDato(
    'urgencia',
    copia.urgencia,
    mensajesLead,
    camposDescartados,
  );
  copia.capacidad_financiera.presupuesto_maximo_uf = validarDato(
    'capacidad_financiera.presupuesto_maximo_uf',
    copia.capacidad_financiera.presupuesto_maximo_uf,
    mensajesLead,
    camposDescartados,
  );
  copia.capacidad_financiera.pie_disponible_uf = validarDato(
    'capacidad_financiera.pie_disponible_uf',
    copia.capacidad_financiera.pie_disponible_uf,
    mensajesLead,
    camposDescartados,
  );
  copia.capacidad_financiera.credito_preaprobado = validarDato(
    'capacidad_financiera.credito_preaprobado',
    copia.capacidad_financiera.credito_preaprobado,
    mensajesLead,
    camposDescartados,
  );
  copia.capacidad_financiera.subsidio_consultado = validarDato(
    'capacidad_financiera.subsidio_consultado',
    copia.capacidad_financiera.subsidio_consultado,
    mensajesLead,
    camposDescartados,
  );
  copia.capacidad_financiera.ingreso_mensual_clp = validarDato(
    'capacidad_financiera.ingreso_mensual_clp',
    copia.capacidad_financiera.ingreso_mensual_clp,
    mensajesLead,
    camposDescartados,
  );
  copia.requisitos_propiedad.dormitorios = validarDato(
    'requisitos_propiedad.dormitorios',
    copia.requisitos_propiedad.dormitorios,
    mensajesLead,
    camposDescartados,
  );
  copia.requisitos_propiedad.unidades = validarDato(
    'requisitos_propiedad.unidades',
    copia.requisitos_propiedad.unidades,
    mensajesLead,
    camposDescartados,
  );
  copia.requisitos_propiedad.entrega_inmediata = validarDato(
    'requisitos_propiedad.entrega_inmediata',
    copia.requisitos_propiedad.entrega_inmediata,
    mensajesLead,
    camposDescartados,
  );
  copia.requisitos_propiedad.estacionamiento_consultado = validarDato(
    'requisitos_propiedad.estacionamiento_consultado',
    copia.requisitos_propiedad.estacionamiento_consultado,
    mensajesLead,
    camposDescartados,
  );
  copia.requisitos_propiedad.bodega_consultada = validarDato(
    'requisitos_propiedad.bodega_consultada',
    copia.requisitos_propiedad.bodega_consultada,
    mensajesLead,
    camposDescartados,
  );

  if (
    copia.derivacion_humana.cita &&
    !citaExisteEnMensajesLead(copia.derivacion_humana.cita, mensajesLead)
  ) {
    camposDescartados.push('derivacion_humana');
    copia.derivacion_humana = {
      requerida: false,
      motivo: null,
      cita: null,
    };
  }

  return {
    analisis: copia,
    camposDescartados,
  };
}

import { z } from 'zod';

const CitaSchema = z.string().min(1);

export const ConversacionInputSchema = z.object({
  id: z.string().min(1),
  mensajes: z
    .array(
      z.object({
        de: z.enum(['lead', 'asistente']),
        texto: z.string().min(1),
      }),
    )
    .min(1),
});

export const MotivoContactoSchema = z.enum([
  'compra_para_vivir',
  'inversion',
  'consulta_arriendo',
  'consulta_caracteristicas',
  'consulta_financiamiento',
  'reclamo',
  'consulta_fuera_de_alcance',
  'numero_equivocado',
  'intento_manipulacion',
  'no_declarado',
]);

export const NivelUrgenciaSchema = z.enum([
  'inmediata',
  'proxima',
]);

export const UrgenciaSchema = z.object({
  nivel: NivelUrgenciaSchema,
  plazo: z.string().min(1).nullable(),
  cita: CitaSchema,
});

const MontoUfSchema = z.object({
  monto: z.number().positive(),
  cita: CitaSchema,
});

const DatoBooleanoSchema = z.object({
  valor: z.literal(true),
  cita: CitaSchema,
});

export const CapacidadFinancieraSchema = z.object({
  presupuesto_maximo_uf: MontoUfSchema.nullable(),
  pie_disponible_uf: MontoUfSchema.nullable(),
  credito_preaprobado: DatoBooleanoSchema.nullable(),
  subsidio_consultado: DatoBooleanoSchema.nullable(),
  ingreso_mensual_clp: z
    .object({
      monto: z.number().positive(),
      cita: CitaSchema,
    })
    .nullable(),
});

export const RequisitosPropiedadSchema = z.object({
  dormitorios: z
    .object({
      cantidad: z.number().int().nonnegative(),
      cita: CitaSchema,
    })
    .nullable(),
  unidades: z
    .object({
      cantidad: z.number().int().positive(),
      cita: CitaSchema,
    })
    .nullable(),
  entrega_inmediata: DatoBooleanoSchema.nullable(),
  estacionamiento_consultado: DatoBooleanoSchema.nullable(),
  bodega_consultada: DatoBooleanoSchema.nullable(),
});

export const MotivoDerivacionSchema = z.enum([
  'reclamo',
  'subsidio',
  'intento_manipulacion',
  'negociacion_comercial',
  'fuera_de_alcance',
]);

export const DerivacionHumanaSchema = z.discriminatedUnion('requerida', [
  z.object({
    requerida: z.literal(false),
    motivo: z.null(),
    cita: z.null(),
  }),
  z.object({
    requerida: z.literal(true),
    motivo: MotivoDerivacionSchema,
    cita: CitaSchema,
  }),
]);

export const BanderaSchema = z.enum([
  'intento_manipulacion',
  'evidencia_invalida',
]);

export const PrioridadSchema = z.object({
  nivel: z.enum(['alta', 'media', 'baja', 'descartar']),
  score: z.number().min(0).max(100),
  motivos: z.array(z.string()),
});

export const AnalisisExtraidoSchema = z.object({
  resumen: z.string().min(1),
  motivo_contacto: MotivoContactoSchema,
  urgencia: UrgenciaSchema.nullable(),
  capacidad_financiera: CapacidadFinancieraSchema,
  requisitos_propiedad: RequisitosPropiedadSchema,
  derivacion_humana: DerivacionHumanaSchema,
  banderas: z.array(BanderaSchema),
});

export const AnalisisResultSchema = AnalisisExtraidoSchema.extend({
  id: z.string(),
  prioridad: PrioridadSchema,
  campos_descartados: z.array(z.string()),
  meta: z.object({
    modelo: z.string(),
    tokens_entrada: z.number().nonnegative(),
    tokens_salida: z.number().nonnegative(),
    costo_usd: z.number().nonnegative().nullable(),
    latencia_ms: z.number().nonnegative(),
  }),
});

export type ConversacionInput = z.infer<typeof ConversacionInputSchema>;
export type AnalisisExtraido = z.infer<typeof AnalisisExtraidoSchema>;
export type AnalisisResult = z.infer<typeof AnalisisResultSchema>;
export type PrioridadResult = z.infer<typeof PrioridadSchema>;

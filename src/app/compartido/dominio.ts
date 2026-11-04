import type {
  EstadoEntrega,
  EstadoPostulacion,
  EstadoVacante,
  Riesgo,
  Rol,
} from '../nucleo/api/modelos';

export type Tono = 'neutro' | 'exito' | 'aviso' | 'peligro' | 'info';

export interface Presentacion {
  texto: string;
  tono: Tono;
  /** El punto late: la persona ve que el sistema está trabajando. */
  vivo?: boolean;
  ayuda?: string;
}

/**
 * Cómo se nombra y se colorea cada estado del dominio.
 *
 * Una sola tabla para todo el producto. Si mañana «fallida» pasa a llamarse
 * de otra forma, no hay que buscarla en siete plantillas.
 */
export const VACANTE: Record<EstadoVacante, Presentacion> = {
  borrador: { texto: 'Borrador', tono: 'neutro', ayuda: 'Todavía no la ve ningún candidato.' },
  publicada: {
    texto: 'Publicada',
    tono: 'exito',
    ayuda: 'Los candidatos invitados ya pueden entregar.',
  },
  cerrada: {
    texto: 'Cerrada',
    tono: 'peligro',
    ayuda: 'No admite cambios ni entregas. No se reabre.',
  },
};

export const ENTREGA: Record<EstadoEntrega, Presentacion> = {
  recibida: { texto: 'En cola', tono: 'info', vivo: true, ayuda: 'Esperando turno de evaluación.' },
  en_evaluacion: {
    texto: 'Evaluando',
    tono: 'info',
    vivo: true,
    ayuda: 'La IA está calificando la entrega.',
  },
  evaluada: { texto: 'Evaluada', tono: 'exito', ayuda: 'La nota ya está disponible.' },
  fallida: {
    texto: 'Falló la evaluación',
    tono: 'peligro',
    ayuda:
      'No es culpa de la entrega: falló el servicio de evaluación. Se puede reintentar sin gastar un intento.',
  },
};

export const POSTULACION: Record<EstadoPostulacion, Presentacion> = {
  en_revision: {
    texto: 'En revisión',
    tono: 'info',
    vivo: true,
    ayuda: 'La empresa aún no decide si te invita a la prueba.',
  },
  aceptada: { texto: 'Invitado', tono: 'exito', ayuda: 'Ya puedes hacer la prueba.' },
  rechazada: {
    texto: 'No continúa',
    tono: 'neutro',
    ayuda: 'La empresa no te invitó a esta prueba.',
  },
};

export const RIESGO: Record<Riesgo, Presentacion> = {
  ninguno: { texto: 'Sin señales', tono: 'exito' },
  bajo: { texto: 'Riesgo bajo', tono: 'neutro' },
  medio: { texto: 'Riesgo medio', tono: 'aviso' },
  alto: { texto: 'Riesgo alto', tono: 'peligro' },
};

export const ROL: Record<Rol, string> = {
  candidato: 'Candidato',
  reclutador: 'Reclutador',
  administrador: 'Administrador',
};

/** La escala de notas del producto: 0 a 100, con el mismo corte en todas partes. */
export function tonoDeNota(nota: number): Tono {
  if (nota >= 80) return 'exito';
  if (nota >= 60) return 'info';
  if (nota >= 40) return 'aviso';
  return 'peligro';
}

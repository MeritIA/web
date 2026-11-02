// ---------------------------------------------------------------------------
// El contrato con el backend, en un solo archivo.
//
// Estos tipos son el espejo de `docs/openapi.json` y de los DTO de NestJS. Si
// el backend cambia, se cambia aqui y el compilador senala cada pantalla que
// hay que tocar: es la razon de que no haya `any` en ningun servicio.
// ---------------------------------------------------------------------------

export type Rol = 'candidato' | 'reclutador' | 'administrador';
export type EstadoVacante = 'borrador' | 'publicada' | 'cerrada';
export type EstadoEntrega = 'recibida' | 'en_evaluacion' | 'evaluada' | 'fallida';
export type Riesgo = 'ninguno' | 'bajo' | 'medio' | 'alto';

/** Limites que el backend impone y la interfaz anticipa para no fallar tarde. */
export const LIMITES = {
  pesoTotalRubrica: 100,
  intentosMin: 1,
  intentosMax: 10,
  archivoMaxBytes: 25 * 1024 * 1024,
  extensiones: ['zip', 'tar', 'gz', 'tgz', 'pdf', 'md', 'txt', 'ipynb', 'sql', 'json'],
} as const;

// --- Sesion ---------------------------------------------------------------
export interface Sesion {
  /** Solo llega en cliente `apk`. En web los tokens van en cookie HttpOnly. */
  tokenDeAcceso?: string;
  tokenDeRenovacion?: string;
  expiraEn: string;
  rol: Rol;
  idUsuario: string;
}

export interface Usuario {
  id: string;
  rol: Rol;
  idEmpresa: string | null;
}

export interface Credenciales {
  correo: string;
  contrasena: string;
}

export interface Registro extends Credenciales {
  nombreCompleto: string;
}

// --- Empresas y usuarios ---------------------------------------------------
export const SECTORES = [
  'financiero',
  'tecnologia',
  'salud',
  'educacion',
  'industria',
  'comercio',
  'servicios',
  'construccion',
  'agro',
  'transporte',
  'energia',
  'telecomunicaciones',
  'gobierno',
  'otro',
] as const;
export type Sector = (typeof SECTORES)[number];

export interface Empresa {
  id: string;
  nombre: string;
  sector: Sector;
  nit: string | null;
  activa: boolean;
  creadaEn: string;
}

export interface NuevaEmpresa {
  nombre: string;
  sector: Sector;
  nit?: string;
}

export interface UsuarioDeEmpresa {
  id: string;
  correo: string;
  nombreCompleto: string;
  rol: Rol;
  idEmpresa: string;
}

export interface NuevoUsuarioDeEmpresa extends Registro {
  rol: 'reclutador' | 'administrador';
}

// --- Vacantes --------------------------------------------------------------
export interface VacanteEjercicio {
  id: string;
  idVacante: string;
  idEjercicio: string;
  orden: number;
}

export interface VacanteCandidato {
  id: string;
  idVacante: string;
  idCandidato: string;
  asignadoEn?: string;
  contratadoEn?: string | null;
}

export interface Vacante {
  id: string;
  titulo: string;
  descripcion: string;
  ubicacion: string | null;
  intentosPermitidos: number;
  estado: EstadoVacante;
  idReclutador: string;
  idEmpresa: string;
  cierreEstimado?: string | null;
  finalistasAEvaluar?: number | null;
  ejercicios?: VacanteEjercicio[];
  candidatos?: VacanteCandidato[];
  publicadaEn: string | null;
  cerradaEn: string | null;
  creadaEn: string;
  actualizadaEn: string;
}

export interface NuevaVacante {
  titulo: string;
  descripcion: string;
  ubicacion?: string;
  intentosPermitidos?: number;
  cierreEstimado?: string;
  finalistasAEvaluar?: number;
}

export type EdicionVacante = Partial<NuevaVacante>;

/** Enunciado y rúbrica vigentes de un ejercicio, tal como los lee quien lo resuelve. */
export interface EjercicioDeLaVacante {
  idEjercicio: string;
  idVersion: string;
  numero: number;
  titulo: string;
  enunciado: string;
  criterios: Criterio[];
}

// --- Ejercicios y rubrica ---------------------------------------------------
export interface Criterio {
  nombre: string;
  descripcion: string;
  /** Los pesos de la rubrica suman exactamente 100. */
  peso: number;
  escalaMaxima: number;
}

export interface CriterioGuardado extends Criterio {
  id: string;
  orden?: number;
}

export interface EjercicioVersion {
  id: string;
  numero: number;
  enunciado: string;
  motivoDelCambio?: string | null;
  criterios: CriterioGuardado[];
  creadaEn: string;
}

export interface Ejercicio {
  id: string;
  titulo: string;
  tecnologia: string | null;
  idAutor: string;
  idEmpresa: string;
  activo: boolean;
  versiones?: EjercicioVersion[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface NuevoEjercicio {
  titulo: string;
  tecnologia?: string;
  enunciado: string;
  criterios: Criterio[];
}

export interface NuevaVersion {
  enunciado: string;
  criterios: Criterio[];
  motivoDelCambio?: string;
}

// --- Entregas ---------------------------------------------------------------
export interface CambioDeEstado {
  desde: EstadoEntrega | null;
  hacia: EstadoEntrega;
  motivo: string | null;
  momento: string;
}

export interface Entrega {
  id: string;
  idVacante: string;
  idCandidato: string;
  idEjercicio: string;
  numeroIntento: number;
  estado: EstadoEntrega;
  /** Verdadero mientras espera en la cola o se esta evaluando. */
  enProcesoDeEvaluacion: boolean;
  archivoNombre: string;
  archivoBytes: number;
  archivoSha256: string;
  creadaEn: string;
  historial?: CambioDeEstado[];
}

export interface EnlaceDeDescarga {
  url: string;
  expiraEnSegundos: number;
}

// --- Evaluaciones -----------------------------------------------------------
export interface Calificacion {
  criterio: string;
  puntaje: number;
  escalaMaxima: number;
  peso: number;
  /** Cita textual de la entrega que justifica el puntaje. Nunca viene vacia. */
  evidencia: string;
}

export interface Bandera {
  codigo: string;
  archivo: string;
  ocurrencias: number;
}

export interface Seguridad {
  riesgo: Riesgo;
  puntaje: number;
  banderas: Bandera[];
  versionReglas: string;
  versionListaNegra: string;
}

export interface Evaluacion {
  id: string;
  idEntrega: string;
  idVacante: string;
  idCandidato: string;
  idEjercicio: string;
  idVersion: string;
  notaFinal: number;
  criterios: Calificacion[];
  proveedor: string;
  modelo: string;
  creadaEn: string;
  seguridad?: Seguridad;
}

export interface MetricasDeCola {
  enEspera: number;
  activos: number;
  reprogramados: number;
  fallidos: number;
  completados: number;
  workerActivo: boolean;
}

// --- Reportes ---------------------------------------------------------------
export interface PromedioDeCriterio {
  criterio: string;
  promedioLogrado: number;
  peso: number;
  evaluaciones: number;
}

export interface ResumenDeVacante {
  candidatosEvaluados: number;
  entregasEvaluadas: number;
  entregasEnProceso: number;
  entregasFallidas: number;
  notaPromedio: number | null;
  notaMediana: number | null;
  notaMaxima: number | null;
  notaMinima: number | null;
  porCriterio: PromedioDeCriterio[];
  entregasConRiesgoAlto: number;
}

export interface HabilidadDestacada {
  criterio: string;
  porcentajeLogrado: number;
  peso: number;
}

export interface FilaDeRanking {
  posicion: number;
  /** El ranking se lee a ciegas: la identidad solo sale revelándola, y queda auditado. */
  alias: string;
  idCandidato: string;
  notaFinal: number;
  intentosEvaluados: number;
  idEntrega: string;
  idEvaluacion: string;
  evaluadaEn: string;
  riesgoInyeccion: Riesgo;
  habilidadDestacada: HabilidadDestacada | null;
}

export interface ReporteDeVacante {
  vacante: { id: string; titulo: string; estado: string };
  resumen: ResumenDeVacante;
  ranking: FilaDeRanking[];
  generadoEn: string;
}

export interface IntentoDelReporte {
  idEvaluacion: string;
  idEntrega: string;
  idEjercicio: string;
  notaFinal: number;
  creadaEn: string;
  riesgoInyeccion: Riesgo;
  criterios: Calificacion[];
}

export interface ReporteDeCandidato {
  vacante: { id: string; titulo: string; estado: string };
  alias: string;
  idCandidato: string;
  posicionEnLaVacante: number | null;
  intentos: IntentoDelReporte[];
  generadoEn: string;
}

export interface IdentidadRevelada {
  alias: string;
  idCandidato: string;
  nombre: string;
  correo: string;
  reveladaEn: string;
}

export interface RevelacionRegistrada {
  alias: string;
  idCandidato: string;
  idUsuario: string;
  reveladaEn: string;
}

export interface PanelDeEmpresa {
  vacantes: { borradores: number; publicadas: number; cerradas: number };
  abiertas: {
    id: string;
    titulo: string;
    publicadaEn: string | null;
    cierreEstimado: string | null;
    finalistasAEvaluar: number | null;
    invitados: number;
    conEntrega: number;
    evaluados: number;
    avance: number;
  }[];
  finalistasEnEvaluacion: number;
  entregasPorEvaluar: number;
  entregasEvaluadas: number;
  entregasFallidas: number;
  contratados: number;
  retosEnElBanco: number;
  generadoEn: string;
}

export interface MiPuesto {
  idVacante: string;
  estadoVacante: EstadoVacante;
  /** Solo con la vacante cerrada: antes, el puesto cambiaría con cada entrega ajena. */
  disponible: boolean;
  motivo?: 'proceso_en_curso' | 'sin_evaluacion';
  puesto: number | null;
  total: number | null;
  notaFinal: number | null;
}

// --- Privacidad y avisos ----------------------------------------------------
export type TipoDeConsentimiento = 'biometria' | 'calificacion_ia' | 'perfil_publico';

export interface Permiso {
  tipo: TipoDeConsentimiento;
  titulo: string;
  descripcion: string;
  concedido: boolean;
  /** El titular nunca decidió: vale el valor inicial. */
  porOmision: boolean;
  decididoEn: string | null;
  versionDelAviso: string | null;
  sePideEnElRegistro: boolean;
  efecto: string;
  /** Si el backend lo hace cumplir hoy. */
  vigilado: boolean;
}

export interface Consentimientos {
  permisos: Permiso[];
  versionDelAviso: string;
  registradas?: number;
}

export interface Aviso {
  idCandidato: string;
  tipo: string;
  estado: string;
  intentos: number;
  enviadoEn: string | null;
  ultimoError: string | null;
}

export interface ResumenDeAvisos {
  idVacante: string;
  considerados: number;
  nuevos: number;
  enviados: number;
  sinCanal: number;
  fallidos: number;
  yaAvisados: number;
  omitido?: string;
}

// --- Errores ----------------------------------------------------------------
/** Forma unica de error de la API (`src/common/errores/respuesta-error.ts`). */
export interface RespuestaError {
  estado: number;
  codigo: string;
  mensaje: string;
  momento: string;
  ruta: string;
  referencia: string;
  errores?: { campo: string; problemas: string[] }[];
}

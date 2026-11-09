// ---------------------------------------------------------------------------
// El contrato con el backend, en un solo archivo.
//
// Estos tipos son el espejo de `docs/openapi.json` y de los DTO de NestJS. Si
// el backend cambia, se cambia aqui y el compilador senala cada pantalla que
// hay que tocar: es la razon de que no haya `any` en ningun servicio.
// ---------------------------------------------------------------------------

export type Rol = 'candidato' | 'reclutador' | 'administrador' | 'moderador';
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
/** Auto-registro de empresa (A01): la empresa y su primer administrador. */
export interface RegistroDeEmpresa extends Registro {
  nombreEmpresa: string;
  sector: Sector;
  nit: string;
}

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
  modalidad?: Modalidad | null;
  tecnologias?: string[];
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

/** Valor de contrato: sin tilde. La pantalla pone la tilde al mostrarlo (`MODALIDAD`). */
export type Modalidad = 'remoto' | 'hibrido' | 'presencial';

export interface NuevaVacante {
  titulo: string;
  descripcion: string;
  ubicacion?: string;
  modalidad?: Modalidad;
  tecnologias?: string[];
  intentosPermitidos?: number;
  cierreEstimado?: string;
  finalistasAEvaluar?: number;
}

/** Editar admite null para borrar lo opcional. */
export type EdicionVacante = Partial<
  Omit<NuevaVacante, 'ubicacion' | 'modalidad' | 'cierreEstimado' | 'finalistasAEvaluar'>
> & {
  ubicacion?: string | null;
  modalidad?: Modalidad | null;
  cierreEstimado?: string | null;
  finalistasAEvaluar?: number | null;
};

/** Enunciado y rúbrica vigentes de un ejercicio, tal como los lee quien lo resuelve. */
export interface EjercicioDeLaVacante {
  idEjercicio: string;
  idVersion: string;
  numero: number;
  titulo: string;
  enunciado: string;
  /** Minutos de la sesión cronometrada; null si no hay límite. */
  duracionMinutos?: number | null;
  adjuntos?: AdjuntoDeEjercicio[];
  criterios: Criterio[];
}

/** Mi ventana de tiempo en un ejercicio cronometrado. El reloj es del servidor. */
export interface SesionDeEjercicio {
  duracionMinutos: number | null;
  iniciadaEn: string | null;
  venceEn: string | null;
  restanteSegundos: number | null;
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

/** Un archivo que acompaña el enunciado (dataset, esqueleto). */
export interface AdjuntoDeEjercicio {
  id: string;
  nombre: string;
  bytes: number;
}

export interface EjercicioVersion {
  id: string;
  numero: number;
  enunciado: string;
  duracionMinutos?: number | null;
  adjuntos?: AdjuntoDeEjercicio[];
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
  duracionMinutos?: number;
  criterios: Criterio[];
}

export interface NuevaVersion {
  enunciado: string;
  duracionMinutos?: number;
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

/** Verificación de una entrega: foto de cámara o modalidad alterna (sin foto). */
export interface VerificacionDeEntrega {
  modalidad: 'camara' | 'alterna' | null;
  creadaEn: string | null;
  conservarHasta: string | null;
  /** Enlace firmado de cinco minutos a la foto, si existe. */
  enlace: string | null;
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

/** Cifras de uso de un ejercicio del banco (A10). Sin uso no aparece: se lee como cero. */
export interface UsoDeEjercicio {
  idEjercicio: string;
  vacantes: number;
  evaluaciones: number;
  notaPromedio: number | null;
}

/** Una persona del banco de talento: alias y mejor nota, nunca su identidad. */
export interface FilaDeTalento {
  idCandidato: string;
  alias: string;
  mejorNota: number;
  evaluaciones: number;
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

// --- Explorar y postular -----------------------------------------------------
export type EstadoPostulacion = 'en_revision' | 'aceptada' | 'rechazada';

/** Una fila del catálogo (`GET /vacantes/abiertas`). */
export interface VacanteAbierta {
  id: string;
  titulo: string;
  empresa: string;
  sector: Sector;
  ubicacion: string | null;
  modalidad: Modalidad | null;
  descripcion: string;
  tecnologias: string[];
  ejercicios: number;
  intentosPorEjercicio: number;
  publicadaEn: string | null;
  cierreEstimado: string | null;
  /** Estado de la postulación de quien pregunta, o null si no se postuló. */
  miPostulacion: EstadoPostulacion | null;
  /** Ya tiene acceso al reto (lo invitaron, se haya postulado o no). */
  yaInvitado: boolean;
}

/** Quien se postuló a una vacante, visto por la empresa. Solo el identificador: el ranking es a ciegas. */
export interface Postulante {
  idCandidato: string;
  estado: EstadoPostulacion;
  creadaEn: string;
  motivoDelRechazo?: string | null;
  /** Cuándo decidió la empresa; null mientras sigue en revisión. */
  decididaEn?: string | null;
}

/** La postulación propia (`POST /vacantes/:id/postular`, `GET /postulaciones/mias`). */
export interface Postulacion {
  idVacante: string;
  estado: EstadoPostulacion;
  creadaEn: string;
  /** Lo que la empresa escribió al rechazar: es lo que el candidato tiene derecho a leer. */
  motivoDelRechazo?: string | null;
  decididaEn?: string | null;
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

// --- Moderación ------------------------------------------------------------
export type OrigenDeCaso = 'antifraude' | 'muestreo' | 'disputa';
export type EstadoDeCaso = 'abierto' | 'restaurado' | 'confirmado';

/** Una fila de la bandeja del moderador. Alias, nunca identidad. */
export interface FilaDeCaso {
  id: string;
  alias: string;
  origen: OrigenDeCaso;
  estado: EstadoDeCaso;
  creadoEn: string;
  venceEn: string;
  vencido: boolean;
}

export interface DetalleDeCaso {
  caso: {
    id: string;
    alias: string;
    origen: OrigenDeCaso;
    estado: EstadoDeCaso;
    creadoEn: string;
    venceEn: string;
    explicacionDeLaDisputa: string | null;
    justificacion: string | null;
    decididoEn: string | null;
  };
  evidencia: {
    notaFinal: number;
    riesgo: string;
    puntajeInyeccion: number;
    banderas: { codigo: string; archivo: string; ocurrencias: number }[];
    descalificada: boolean;
    criterios: { criterio: string; puntaje: number; escalaMaxima: number; evidencia: string }[];
  };
}

export interface MiCaso {
  id: string;
  idVacante: string;
  origen: OrigenDeCaso;
  estado: EstadoDeCaso;
  creadoEn: string;
  decididoEn: string | null;
  justificacion: string | null;
  puedeDisputar: boolean;
}

export interface MetricasDeModeracion {
  casos: {
    total: number;
    abiertos: number;
    confirmados: number;
    restaurados: number;
    porOrigen: { antifraude: number; muestreo: number; disputa: number };
  };
  tasaDeFalsosPositivos: number | null;
  coberturaDelMuestreo: number | null;
  horasPromedioDeResolucion: number | null;
  vencidosSinDecidir: number;
  slaHoras: number;
}

// --- Auditoría de una vacante (A09) -----------------------------------------
export interface AuditoriaDeVacante {
  vacante: { id: string; titulo: string; estado: string };
  generadoEn: string;
  integridad: {
    evaluaciones: number;
    descalificadas: number;
    riesgoAlto: number;
    riesgoMedio: number;
    entregasFallidas: number;
    entregasEnProceso: number;
  };
  distribucion: {
    candidatosEvaluados: number;
    notaPromedio: number | null;
    notaMediana: number | null;
    notaMinima: number | null;
    notaMaxima: number | null;
    histograma: { desde: number; hasta: number; candidatos: number }[];
  };
  trazabilidad: {
    identidadesReveladas: number;
    revelaciones: { alias: string; idUsuario: string; reveladaEn: string }[];
    contratados: number;
  };
  sesgo: { medible: false; motivo: string };
}

// --- Mentor IA ---------------------------------------------------------------
export interface ContextoDelMentor {
  totalEvaluaciones: number;
  promedio: number;
  perfil: { nombre: string; porcentaje: number; veces: number }[];
  recientes: {
    reto: string;
    nota: number;
    flojo?: { criterio: string; porcentaje: number; evidencia: string };
  }[];
}

/** Material de estudio en que se apoya una respuesta del mentor. */
export interface FuenteDelMentor {
  n: number;
  titulo: string;
  archivo: string;
  extracto: string;
}

export interface TurnoDelMentor {
  rol: 'candidato' | 'mentor';
  texto: string;
  /** Solo en turnos del mentor; no se reenvía al servidor. */
  fuentes?: FuenteDelMentor[];
}

export interface RespuestaDelMentor {
  respuesta: string;
  sugerencias: string[];
  fuentes?: FuenteDelMentor[];
}

// --- Pagos (simulados en el navegador) ---------------------------------------
export interface AbonoSimulado {
  /** Una vez por reto: el mejor intento de cada ejercicio en cada vacante. */
  clave: string;
  idEvaluacion: string;
  nota: number;
  monto: number;
  fecha: string;
}

export interface RetiroSimulado {
  id: string;
  monto: number;
  destino: string;
  fecha: string;
}

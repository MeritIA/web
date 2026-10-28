/**
 * Los tipos que viajan por la API, copiados del contrato del backend
 * (`backend/docs/openapi.json`, 47 operaciones).
 *
 * POR QUE A MANO Y NO GENERADOS
 *
 * Generar el cliente entero desde OpenAPI trae 47 operaciones y decenas de
 * esquemas, de los cuales el MVP usa cinco. Lo generado se vuelve ruido que
 * nadie lee y que tapa el unico sitio donde se nota que el contrato cambio.
 * Aqui se escribe solo lo que se consume, y cada campo esta puesto porque una
 * pantalla lo muestra.
 *
 * QUE PASA SI EL BACKEND CAMBIA
 *
 * Estos tipos son una promesa, no una verificacion: TypeScript no comprueba
 * que el servidor devuelva esto. Por eso el backend tiene `openapi:check` en
 * su CI, y por eso aqui no se usa `any` en ninguna respuesta: si un campo
 * desaparece, el error sale en la plantilla y no tres pantallas mas alla.
 */

/** Los tres roles del backend (`dominio/rol.ts`). No hay mas. */
export type Rol = 'candidato' | 'reclutador' | 'administrador';

/**
 * Quien esta autenticado, segun `GET /autenticacion/yo`.
 *
 * Es la UNICA fuente de verdad de la sesion en el front. El token no se puede
 * leer: viaja en una cookie HttpOnly y JavaScript no lo ve, que es justo el
 * punto del paquete 3.5 del backend.
 */
export interface Identidad {
  readonly id: string;
  readonly rol: Rol;
  /** Null en un candidato, y en un administrador de plataforma. */
  readonly idEmpresa: string | null;
}

/** Lo que se manda a `POST /autenticacion/login`. */
export interface Credenciales {
  readonly correo: string;
  readonly contrasena: string;
  /**
   * Siempre 'web' desde el navegador. El backend decide con esto si el token
   * va en una cookie HttpOnly (web) o en el cuerpo (apk). No se adivina por el
   * User-Agent a proposito: equivocarse ahi significa devolver el token en el
   * cuerpo a un navegador.
   */
  readonly cliente: 'web';
}

/**
 * Lo que devuelve el login en web.
 *
 * `tokenDeAcceso` y `tokenDeRenovacion` NO vienen: en web el cuerpo sale sin
 * tokens. Si algun dia aparecieran aqui, seria un fallo de seguridad del
 * backend, no una comodidad.
 */
export interface SesionIniciada {
  readonly expiraEn: string;
  readonly rol: Rol;
  readonly idUsuario: string;
}

/** Una vacante abierta en el panel de la empresa (pantalla A02). */
export interface ProgresoDeVacante {
  readonly id: string;
  readonly titulo: string;
  readonly publicadaEn: string | null;
  /** Estimado del reclutador. No cierra la vacante y puede estar en el pasado. */
  readonly cierreEstimado: string | null;
  /** Lo planeado al publicar. Los evaluados pueden superarlo: es un plan, no un tope. */
  readonly finalistasAEvaluar: number | null;
  readonly invitados: number;
  /** PERSONAS con al menos una entrega, no entregas. */
  readonly conEntrega: number;
  /** PERSONAS con evaluacion. Es el numerador del avance. */
  readonly evaluados: number;
  /**
   * 0 a 100, o **null si no hay nadie invitado**.
   *
   * La pantalla TIENE que distinguirlos: null es "no has invitado a nadie" y 0
   * es "invitaste y nadie ha avanzado". Pintarlos igual hace que el panel
   * mienta justo en la vacante recien publicada.
   */
  readonly avance: number | null;
}

/** Las cifras de la empresa en una sola llamada (`GET /reportes/panel`). */
export interface PanelDeEmpresa {
  readonly vacantes: {
    readonly borradores: number;
    readonly publicadas: number;
    readonly cerradas: number;
  };
  readonly abiertas: readonly ProgresoDeVacante[];
  /** PERSONAS con alguna entrega por evaluar, no entregas. */
  readonly finalistasEnEvaluacion: number;
  readonly entregasPorEvaluar: number;
  readonly entregasEvaluadas: number;
  readonly entregasFallidas: number;
  readonly contratados: number;
  readonly retosEnElBanco: number;
  readonly generadoEn: string;
}

/** El cuerpo de error del backend. Su filtro global siempre devuelve esta forma. */
export interface ErrorDeApi {
  readonly mensaje?: string;
  readonly codigo?: string;
}

/** El criterio en el que mejor le fue a un candidato, del mismo intento que da la nota. */
export interface HabilidadDestacada {
  readonly criterio: string;
  readonly porcentajeLogrado: number;
  readonly peso: number;
}

/**
 * Una fila del ranking de A06.
 *
 * **No trae nombre ni correo, y eso es el producto, no un descuido.** El
 * objetivo de MeritIA es reducir el sesgo en la evaluacion, y A06 lo
 * instrumenta: "identidad oculta hasta que selecciones a quien contactar". Un
 * nombre en la tabla permite exactamente el sesgo que el producto dice evitar
 * —por genero, por origen, por la universidad que se adivina en un apellido—
 * justo mientras se compara a las personas entre si.
 *
 * `idCandidato` si viene, porque las otras llamadas lo necesitan; no dice
 * quien es nadie.
 */
export interface FilaDeRanking {
  readonly posicion: number;
  /** Lo que se muestra en lugar del nombre. */
  readonly alias: string;
  readonly idCandidato: string;
  readonly notaFinal: number;
  /** Cuantos intentos se le evaluaron. La nota es la de su mejor intento. */
  readonly intentosEvaluados: number;
  readonly idEntrega: string;
  readonly idEvaluacion: string;
  readonly evaluadaEn: string;
  /** Riesgo de inyeccion de instrucciones detectado al evaluar. */
  readonly riesgoInyeccion: string;
  /** Nulo si esa evaluacion no trae desglose. */
  readonly habilidadDestacada: HabilidadDestacada | null;
}

export interface ResumenDelReporte {
  readonly candidatosEvaluados: number;
  readonly entregasEvaluadas: number;
  readonly entregasEnProceso: number;
  readonly entregasFallidas: number;
  readonly notaPromedio: number | null;
  readonly notaMediana: number | null;
  readonly notaMaxima: number | null;
  readonly notaMinima: number | null;
  readonly entregasConRiesgoAlto: number;
}

export interface ReporteDeVacante {
  readonly vacante: { readonly id: string; readonly titulo: string; readonly estado: string };
  readonly resumen: ResumenDelReporte;
  readonly ranking: readonly FilaDeRanking[];
  readonly generadoEn: string;
}

/**
 * Lo que devuelve revelar una identidad.
 *
 * Pedir esto **queda auditado** en el backend: quien lo hizo, cuando y de
 * quien. No es una consulta mas.
 */
export interface IdentidadRevelada {
  readonly alias: string;
  readonly idCandidato: string;
  readonly nombre: string;
  readonly correo: string;
  readonly reveladaEn: string;
}

/** Un criterio de la rubrica, con la evidencia que justifica el puntaje. */
export interface CriterioDelIntento {
  readonly criterio: string;
  readonly puntaje: number;
  readonly escalaMaxima: number;
  /** Cuanto pesa en la nota final. Los pesos de una rubrica suman 100. */
  readonly peso: number;
  /**
   * La cita del entregable que sostiene el puntaje.
   *
   * Es lo que separa una nota de un juicio: sin evidencia, el candidato no
   * puede discutir nada y el reclutador no puede defender la decision.
   */
  readonly evidencia: string;
}

/** Un intento evaluado de un candidato. */
export interface IntentoEvaluado {
  readonly idEvaluacion: string;
  readonly idEntrega: string;
  readonly idEjercicio: string;
  readonly notaFinal: number;
  readonly creadaEn: string;
  readonly riesgoInyeccion: string;
  readonly criterios: readonly CriterioDelIntento[];
}

/** Lo que muestra la pantalla A07, ver entrega. */
export interface ReporteDeCandidato {
  readonly vacante: { readonly id: string; readonly titulo: string; readonly estado: string };
  /** Sigue siendo el alias: entrar al detalle NO revela a nadie. */
  readonly alias: string;
  readonly idCandidato: string;
  readonly posicionEnLaVacante: number | null;
  /** Todos sus intentos, no solo el mejor. */
  readonly intentos: readonly IntentoEvaluado[];
  readonly generadoEn: string;
}

/** Estado de un aviso por correo a un candidato (modulo de notificaciones). */
export interface AvisoDeCierre {
  readonly idCandidato: string;
  readonly tipo: string;
  /**
   * `pendiente` registrado y sin enviar · `enviando` reservado por una ronda
   * en curso · `enviada` entregado al servidor de correo · `sin_canal` no hay
   * SMTP configurado · `fallida` el servidor rechazo el envio.
   *
   * `sin_canal` NO es un fallo: es un entorno sin correo configurado, y
   * mezclarlo con `fallida` haria imposible saber si reintentar tiene sentido.
   */
  readonly estado: string;
  readonly intentos: number;
  readonly enviadoEn: string | null;
  readonly ultimoError: string | null;
}

/** Lo que deja una ronda de avisos. */
export interface ResumenDeAvisos {
  readonly idVacante: string;
  /** Candidatos con al menos una entrega evaluada: los que pueden recibir aviso. */
  readonly considerados: number;
  readonly nuevos: number;
  readonly enviados: number;
  readonly sinCanal: number;
  readonly fallidos: number;
  /** Ya los tenian enviados y no se volvieron a tocar. */
  readonly yaAvisados: number;
  /** Por que no se envio nada: `vacante_no_cerrada`, `canal_apagado`... */
  readonly omitido?: string;
}

/** Una vacante tal como la devuelve el modulo de vacantes. */
export interface Vacante {
  readonly id: string;
  readonly titulo: string;
  readonly estado: 'borrador' | 'publicada' | 'cerrada';
  readonly cerradaEn: string | null;
  readonly candidatos?: readonly {
    readonly idCandidato: string;
    readonly contratadoEn: string | null;
  }[];
}

/** Un criterio de la rubrica, tal como lo ve el candidato ANTES de entregar. */
export interface CriterioDeLaRubrica {
  readonly nombre: string;
  readonly descripcion: string;
  /** Cuanto pesa en la nota. Los pesos de una rubrica suman 100. */
  readonly peso: number;
  readonly escalaMaxima: number;
}

/**
 * El reto que el candidato tiene que resolver.
 *
 * Trae la rubrica COMPLETA, con los pesos. El candidato sabe de antemano con
 * que se le va a medir: es la diferencia entre una prueba y un examen sorpresa.
 */
export interface RetoDeLaVacante {
  readonly idEjercicio: string;
  readonly idVersion: string;
  readonly numero: number;
  readonly titulo: string;
  readonly enunciado: string;
  readonly criterios: readonly CriterioDeLaRubrica[];
}

/** Una entrega del candidato. */
export interface EntregaPropia {
  readonly id: string;
  readonly idVacante: string;
  readonly idEjercicio: string;
  readonly numeroIntento: number;
  readonly estado: 'recibida' | 'en_evaluacion' | 'evaluada' | 'fallida';
  readonly archivoNombre: string;
  readonly archivoBytes: number;
  readonly creadaEn: string;
}

/** La evaluacion de una entrega, con su desglose. */
export interface EvaluacionPropia {
  readonly id: string;
  readonly idEntrega: string;
  readonly idVacante: string;
  readonly idEjercicio: string;
  readonly notaFinal: number;
  readonly criterios: readonly CriterioDelIntento[];
  readonly creadaEn: string;
}

/**
 * El puesto del candidato en una vacante.
 *
 * `disponible` es `false` mientras la vacante siga abierta, y `motivo` dice por
 * que: saber que vas tercero con el proceso en marcha cambiaria como te
 * comportas, y los demas todavia pueden entregar.
 */
export interface MiPuesto {
  readonly idVacante: string;
  readonly estadoVacante: string;
  readonly disponible: boolean;
  readonly motivo: string;
  readonly puesto: number | null;
  readonly total: number | null;
  readonly notaFinal: number | null;
}

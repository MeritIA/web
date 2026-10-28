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

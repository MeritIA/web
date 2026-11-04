import { HttpErrorResponse } from '@angular/common/http';
import type { RespuestaError } from './modelos';

/**
 * Traduce un fallo HTTP a algo que una persona pueda leer.
 *
 * Esta en un solo sitio porque el backend ya devuelve un `codigo` estable y
 * legible por maquina: repetir el `switch` en cada pantalla seria la forma
 * segura de que dos pantallas expliquen el mismo error de dos maneras.
 */
const PORENCIMA_DEL_MENSAJE: Record<string, string> = {
  NO_AUTENTICADO: 'Tu sesión expiró. Vuelve a entrar para continuar.',
  PROHIBIDO: 'Tu rol no permite esta acción.',
  NO_ENCONTRADO: 'No encontramos eso, o no tienes acceso.',
  LIMITE_DE_PETICIONES_EXCEDIDO: 'Demasiados intentos seguidos. Espera un momento.',
  ERROR_INTERNO: 'Algo falló de nuestro lado. Vuelve a intentarlo en unos segundos.',
};

export interface ProblemaDeCampo {
  campo: string;
  problemas: string[];
}

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly campos: ProblemaDeCampo[] = [],
    readonly reintentarEn?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  /** Mensaje para la persona, no para el log. */
  get texto(): string {
    return PORENCIMA_DEL_MENSAJE[this.codigo] ?? this.message;
  }
}

/** Convierte cualquier cosa que lance HttpClient en un `ErrorApi`. */
export function comoErrorApi(causa: unknown): ErrorApi {
  if (causa instanceof ErrorApi) return causa;

  if (causa instanceof HttpErrorResponse) {
    // Estado 0: el navegador no llegó a hablar con el servidor.
    if (causa.status === 0) {
      return new ErrorApi(
        0,
        'SIN_CONEXION',
        'No pudimos contactar al servidor. Revisa tu conexión o que el backend esté levantado.',
      );
    }

    const cuerpo = causa.error as Partial<RespuestaError> | null;
    const espera = Number(causa.headers.get('Retry-After'));

    return new ErrorApi(
      causa.status,
      cuerpo?.codigo ?? 'ERROR_INTERNO',
      cuerpo?.mensaje ?? causa.message,
      cuerpo?.errores?.map((e) => ({ campo: e.campo, problemas: [...e.problemas] })) ?? [],
      Number.isFinite(espera) && espera > 0 ? espera : undefined,
    );
  }

  return new ErrorApi(0, 'ERROR_INTERNO', causa instanceof Error ? causa.message : String(causa));
}

export const mensajeDeError = (causa: unknown): string => comoErrorApi(causa).texto;

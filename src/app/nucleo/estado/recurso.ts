import { type Signal, effect, signal } from '@angular/core';
import { mensajeDeError } from '../api/errores';

/**
 * Un dato que se trae del servidor, con sus tres estados visibles.
 *
 * Existe para que ninguna pantalla vuelva a escribir el trio
 * `cargando / error / datos` a mano. Veinte pantallas repitiendo ese bloque es
 * veinte oportunidades de olvidar apagar el indicador de carga en el `catch`.
 */
export interface Recurso<T> {
  readonly datos: Signal<T | undefined>;
  readonly error: Signal<string | null>;
  readonly cargando: Signal<boolean>;
  /** Vuelve a pedir el dato. Lo usan el botón «reintentar» y el sondeo. */
  recargar(): Promise<void>;
  /** Sustituye el valor local tras una mutación, sin ir al servidor. */
  fijar(valor: T): void;
}

function crear<T>(cargar: () => Promise<T>): Recurso<T> {
  const datos = signal<T | undefined>(undefined);
  const error = signal<string | null>(null);
  const cargando = signal(false);

  const recargar = async () => {
    cargando.set(true);
    error.set(null);
    try {
      datos.set(await cargar());
    } catch (causa) {
      error.set(mensajeDeError(causa));
    } finally {
      cargando.set(false);
    }
  };

  return {
    datos: datos.asReadonly(),
    error: error.asReadonly(),
    cargando: cargando.asReadonly(),
    recargar,
    fijar: (valor) => datos.set(valor),
  };
}

/** Carga una vez al construir el componente. */
export function recurso<T>(cargar: () => Promise<T>): Recurso<T> {
  const r = crear(cargar);
  void r.recargar();
  return r;
}

/**
 * Carga, y vuelve a cargar cada vez que cambia la clave.
 *
 * Es lo que hace que navegar de una vacante a otra refresque el detalle
 * aunque Angular reutilice el componente.
 */
export function recursoPor<P, T>(clave: Signal<P>, cargar: (clave: P) => Promise<T>): Recurso<T> {
  // La clave se lee dentro del efecto y no aquí: cuando viene de una entrada
  // de ruta todavía no tiene valor en el momento de construir el componente.
  let actual: P;
  const r = crear(() => cargar(actual));

  effect(() => {
    actual = clave();
    void r.recargar();
  });

  return r;
}

export interface Accion<A extends unknown[], T> {
  readonly enviando: Signal<boolean>;
  readonly error: Signal<string | null>;
  /** Devuelve el resultado, o `undefined` si falló: el error ya quedó expuesto. */
  correr(...argumentos: A): Promise<T | undefined>;
  limpiar(): void;
}

/**
 * La cara mutable del mismo problema: enviar un formulario o pulsar una
 * acción, sin que cada pantalla invente su propio `guardando = true`.
 */
export function accion<A extends unknown[], T>(
  ejecutar: (...argumentos: A) => Promise<T>,
): Accion<A, T> {
  const enviando = signal(false);
  const error = signal<string | null>(null);

  return {
    enviando: enviando.asReadonly(),
    error: error.asReadonly(),
    limpiar: () => error.set(null),
    async correr(...argumentos: A) {
      if (enviando()) return undefined; // doble clic: una sola petición
      enviando.set(true);
      error.set(null);
      try {
        return await ejecutar(...argumentos);
      } catch (causa) {
        error.set(mensajeDeError(causa));
        return undefined;
      } finally {
        enviando.set(false);
      }
    },
  };
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { Sesion } from '../sesion/sesion';
import { EvaluacionesServicio } from './evaluaciones.servicio';
import type { AbonoSimulado, Evaluacion, RetiroSimulado } from './modelos';

/** Saldo mínimo para poder retirar, en pesos colombianos. */
export const UMBRAL_DE_RETIRO = 200_000;

const BASE = 40_000;
const VARIABLE = 60_000;

/** Lo que paga un reto según la nota: entre 40.000 y 100.000, en múltiplos de 1.000. */
export function montoPorNota(nota: number): number {
  const acotada = Math.min(100, Math.max(0, nota));
  return BASE + Math.round((VARIABLE * acotada) / 100 / 1000) * 1000;
}

/**
 * Remuneración por reto, SIMULADA en el navegador.
 *
 * El backend no tiene pagos (decisión de alcance del 02/11) y esto no mueve
 * dinero: es una emulación para ver el flujo. Los abonos no se guardan, se
 * derivan de las evaluaciones reales —el mejor intento de cada ejercicio en
 * cada vacante—, así que no pueden descuadrarse. Lo único que se persiste son
 * los retiros, en el almacenamiento local y por usuario.
 *
 * El punto de cambio cuando exista un cobro real es este archivo: la pantalla
 * solo conoce `abonos`, `retiros`, `saldo` y `retirar`.
 */
@Injectable({ providedIn: 'root' })
export class PagosServicio {
  readonly #sesion = inject(Sesion);
  readonly #evaluaciones = inject(EvaluacionesServicio);

  readonly #abonos = signal<AbonoSimulado[]>([]);
  readonly #retiros = signal<RetiroSimulado[]>(this.#leer());

  readonly abonos = this.#abonos.asReadonly();
  readonly retiros = this.#retiros.asReadonly();
  readonly acumulado = computed(() => this.#abonos().reduce((a, x) => a + x.monto, 0));
  readonly retirado = computed(() => this.#retiros().reduce((a, x) => a + x.monto, 0));
  readonly saldo = computed(() => this.acumulado() - this.retirado());
  readonly puedeRetirar = computed(() => this.saldo() >= UMBRAL_DE_RETIRO);
  /** Cuánto falta para poder retirar; 0 si ya se puede. */
  readonly faltante = computed(() => Math.max(0, UMBRAL_DE_RETIRO - this.saldo()));

  /** Recalcula los abonos desde las evaluaciones del backend. */
  async actualizar(): Promise<void> {
    // Se relee por si cambió la persona que usa el navegador.
    this.#retiros.set(this.#leer());
    this.#abonos.set(abonosDe(await this.#evaluaciones.mias()));
  }

  /** Retira todo el saldo hacia el destino indicado. */
  retirar(destino: string): RetiroSimulado {
    const saldo = this.saldo();
    if (saldo < UMBRAL_DE_RETIRO) {
      throw new Error(`Necesitas acumular al menos ${UMBRAL_DE_RETIRO.toLocaleString('es-CO')}.`);
    }
    const retiro: RetiroSimulado = {
      id: crypto.randomUUID(),
      monto: saldo,
      destino,
      fecha: new Date().toISOString(),
    };
    this.#retiros.update((r) => [retiro, ...r]);
    this.#guardar();
    return retiro;
  }

  get #clave(): string {
    return `meritia.pagos-simulados.${this.#sesion.usuario()?.id ?? 'anonimo'}`;
  }

  #leer(): RetiroSimulado[] {
    try {
      const bruto = localStorage.getItem(this.#clave);
      const datos: unknown = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(datos) ? (datos as RetiroSimulado[]) : [];
    } catch {
      return [];
    }
  }

  #guardar(): void {
    try {
      localStorage.setItem(this.#clave, JSON.stringify(this.#retiros()));
    } catch {
      // Sin almacenamiento el retiro vale solo para esta sesión: es una emulación.
    }
  }
}

/** Un abono por ejercicio y vacante, con el mejor intento. */
export function abonosDe(evaluaciones: Evaluacion[]): AbonoSimulado[] {
  const mejores = new Map<string, Evaluacion>();
  for (const e of evaluaciones) {
    const clave = `${e.idVacante}:${e.idEjercicio}`;
    const previa = mejores.get(clave);
    if (!previa || e.notaFinal > previa.notaFinal) mejores.set(clave, e);
  }
  return [...mejores.entries()]
    .map(([clave, e]) => ({
      clave,
      idEvaluacion: e.id,
      nota: e.notaFinal,
      monto: montoPorNota(e.notaFinal),
      fecha: e.creadaEn,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

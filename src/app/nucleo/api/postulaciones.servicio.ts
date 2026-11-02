import { Injectable, inject } from '@angular/core';
import { Sesion } from '../sesion/sesion';
import { CATALOGO_SIMULADO } from './mocks/vacantes-abiertas.mock';
import type { Postulacion, VacanteAbierta } from './modelos';

/**
 * Explorar vacantes y postular.
 *
 * ES UN MOCK. El backend no tiene catálogo público ni postulaciones: hoy un
 * candidato solo ve las vacantes a las que lo invitaron. Esta clase simula los
 * dos endpoints que harían falta y guarda las postulaciones en el navegador,
 * por usuario, para que la pantalla se pueda construir y demostrar ya.
 *
 * Cuando el backend los ofrezca, solo cambia el cuerpo de estos tres métodos
 * por llamadas a `Api`; las pantallas no se tocan. La firma es la del contrato
 * que se le propondría:
 *
 * - `abiertas`  → `GET  /vacantes/abiertas`
 * - `postular`  → `POST /vacantes/:id/postular`
 * - `mias`      → `GET  /postulaciones/mias`
 */
@Injectable({ providedIn: 'root' })
export class PostulacionesServicio {
  readonly #sesion = inject(Sesion);

  /** Latencia simulada: sin ella el estado de carga no se llega a ver ni a probar. */
  readonly #latenciaMs = 350;

  readonly esSimulado = true;

  async abiertas(): Promise<VacanteAbierta[]> {
    await this.#esperar();
    return CATALOGO_SIMULADO;
  }

  async mias(): Promise<Postulacion[]> {
    await this.#esperar();
    return this.#leer();
  }

  async postular(idVacante: string): Promise<Postulacion> {
    await this.#esperar();
    if (!CATALOGO_SIMULADO.some((v) => v.id === idVacante)) {
      throw new Error('La vacante ya no está abierta.');
    }
    const actuales = this.#leer();
    const previa = actuales.find((p) => p.idVacante === idVacante);
    if (previa) return previa; // postular dos veces es lo mismo que una

    const nueva: Postulacion = {
      idVacante,
      estado: 'en_revision',
      creadaEn: new Date().toISOString(),
    };
    this.#guardar([...actuales, nueva]);
    return nueva;
  }

  async retirar(idVacante: string): Promise<void> {
    await this.#esperar();
    this.#guardar(this.#leer().filter((p) => p.idVacante !== idVacante));
  }

  // --- Almacén local ---------------------------------------------------------
  get #clave(): string {
    return `meritia.simulado.postulaciones.${this.#sesion.usuario()?.id ?? 'anonimo'}`;
  }

  #leer(): Postulacion[] {
    try {
      const texto = localStorage.getItem(this.#clave);
      return texto ? (JSON.parse(texto) as Postulacion[]) : [];
    } catch {
      return []; // almacenamiento bloqueado o corrupto: se parte de cero
    }
  }

  #guardar(valor: Postulacion[]): void {
    try {
      localStorage.setItem(this.#clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento la postulación dura lo que dure la pestaña: es un mock.
    }
  }

  #esperar(): Promise<void> {
    return new Promise((resolver) => setTimeout(resolver, this.#latenciaMs));
  }
}

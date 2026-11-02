import { Injectable, inject } from '@angular/core';
import { Sesion } from '../sesion/sesion';
import { CATALOGO_SIMULADO } from './mocks/vacantes-abiertas.mock';
import type {
  EstadoPostulacion,
  Postulacion,
  Postulante,
  Vacante,
  VacanteAbierta,
} from './modelos';

type Libro = Record<string, Postulante[]>;

/**
 * Explorar vacantes, postular y decidir sobre los postulantes.
 *
 * ES UN MOCK, de los dos lados. El backend no tiene catálogo abierto ni
 * postulaciones: hoy un candidato solo ve las vacantes a las que lo invitaron.
 * Esta clase simula los endpoints que harían falta y guarda todo en el
 * navegador, en un almacén COMPARTIDO entre usuarios (no uno por persona), para
 * que la demostración recorra los dos lados con dos sesiones en el mismo
 * navegador: el candidato se postula, la empresa decide.
 *
 * Qué hay de real y qué no:
 * - Las vacantes que la empresa publica de verdad entran al catálogo cuando el
 *   reclutador abre su detalle (`registrarVacante`). Aceptar a un postulante de
 *   una de ellas SÍ lo invita en el backend (lo hace la pantalla con
 *   `VacantesServicio.invitarCandidato`), así que ese candidato puede hacer la
 *   prueba de verdad.
 * - Las cinco vacantes de `CATALOGO_SIMULADO` son ficticias: nadie las decide.
 *
 * Cuando el backend ofrezca esto, cambia el cuerpo de estos métodos por
 * llamadas a `Api`; las pantallas no se tocan. Contrato que se propondría:
 *
 * - `abiertas`      → `GET  /vacantes/abiertas`
 * - `postular`      → `POST /vacantes/:id/postular`
 * - `mias`          → `GET  /postulaciones/mias`
 * - `deVacante`     → `GET  /vacantes/:id/postulaciones`
 * - `decidir`       → `POST /vacantes/:id/postulaciones/:idCandidato/{aceptar|rechazar}`
 */
@Injectable({ providedIn: 'root' })
export class PostulacionesServicio {
  readonly #sesion = inject(Sesion);

  /** Latencia simulada: sin ella el estado de carga no se llega a ver ni a probar. */
  readonly #latenciaMs = 350;
  readonly #claveLibro = 'meritia.simulado.postulaciones.v2';
  readonly #claveCatalogo = 'meritia.simulado.catalogo-real.v2';

  // --- Candidato ---------------------------------------------------------------
  async abiertas(): Promise<VacanteAbierta[]> {
    await this.#esperar();
    return [...this.#leer<VacanteAbierta[]>(this.#claveCatalogo, []), ...CATALOGO_SIMULADO];
  }

  async mias(): Promise<Postulacion[]> {
    await this.#esperar();
    const yo = this.#sesion.usuario()?.id;
    return Object.entries(this.#leer<Libro>(this.#claveLibro, {})).flatMap(([idVacante, lista]) =>
      lista
        .filter((p) => p.idCandidato === yo)
        .map((p) => ({ idVacante, estado: p.estado, creadaEn: p.creadaEn })),
    );
  }

  async postular(idVacante: string): Promise<Postulacion> {
    await this.#esperar();
    const yo = this.#sesion.usuario()?.id;
    if (!yo) throw new Error('Inicia sesión para postularte.');
    if (!this.#abiertasSinEspera().some((v) => v.id === idVacante)) {
      throw new Error('La vacante ya no está abierta.');
    }

    const libro = this.#leer<Libro>(this.#claveLibro, {});
    const lista = libro[idVacante] ?? [];
    const previa = lista.find((p) => p.idCandidato === yo);
    if (previa) return { idVacante, estado: previa.estado, creadaEn: previa.creadaEn }; // dos veces es una

    const nueva: Postulante = {
      idCandidato: yo,
      estado: 'en_revision',
      creadaEn: new Date().toISOString(),
    };
    this.#guardar(this.#claveLibro, { ...libro, [idVacante]: [...lista, nueva] });
    return { idVacante, estado: nueva.estado, creadaEn: nueva.creadaEn };
  }

  /** Solo se retira lo que todavía no decidió la empresa. */
  async retirar(idVacante: string): Promise<void> {
    await this.#esperar();
    const yo = this.#sesion.usuario()?.id;
    const libro = this.#leer<Libro>(this.#claveLibro, {});
    const lista = (libro[idVacante] ?? []).filter(
      (p) => !(p.idCandidato === yo && p.estado === 'en_revision'),
    );
    this.#guardar(this.#claveLibro, { ...libro, [idVacante]: lista });
  }

  // --- Empresa -----------------------------------------------------------------
  /**
   * Pone una vacante publicada en el catálogo de explorar (o la saca si se
   * cerró). En el backend real esto sería simplemente «las vacantes publicadas».
   */
  registrarVacante(vacante: Vacante): void {
    const catalogo = this.#leer<VacanteAbierta[]>(this.#claveCatalogo, []).filter(
      (v) => v.id !== vacante.id,
    );
    if (vacante.estado === 'publicada') {
      catalogo.unshift({
        id: vacante.id,
        titulo: vacante.titulo,
        empresa: 'Tu empresa',
        sector: 'servicios',
        ubicacion: vacante.ubicacion ?? 'Sin ubicación',
        modalidad: /remot/i.test(vacante.ubicacion ?? '') ? 'remoto' : 'híbrido',
        descripcion: vacante.descripcion,
        tecnologias: [],
        ejercicios: vacante.ejercicios?.length ?? 0,
        intentosPorEjercicio: vacante.intentosPermitidos,
        publicadaEn: vacante.publicadaEn ?? vacante.creadaEn,
        cierreEstimado: vacante.cierreEstimado ?? null,
        real: true,
      });
    }
    this.#guardar(this.#claveCatalogo, catalogo);
  }

  async deVacante(idVacante: string): Promise<Postulante[]> {
    await this.#esperar();
    return [...(this.#leer<Libro>(this.#claveLibro, {})[idVacante] ?? [])].sort((a, b) =>
      b.creadaEn.localeCompare(a.creadaEn),
    );
  }

  /**
   * Registra la decisión. Invitar de verdad al aceptado es cosa de quien llama
   * (la pantalla de la vacante): este servicio solo recuerda qué se decidió.
   */
  async decidir(
    idVacante: string,
    idCandidato: string,
    estado: Exclude<EstadoPostulacion, 'en_revision'>,
  ): Promise<void> {
    await this.#esperar();
    const libro = this.#leer<Libro>(this.#claveLibro, {});
    const lista = (libro[idVacante] ?? []).map((p) =>
      p.idCandidato === idCandidato ? { ...p, estado } : p,
    );
    this.#guardar(this.#claveLibro, { ...libro, [idVacante]: lista });
  }

  // --- Almacén local -----------------------------------------------------------
  #abiertasSinEspera(): VacanteAbierta[] {
    return [...this.#leer<VacanteAbierta[]>(this.#claveCatalogo, []), ...CATALOGO_SIMULADO];
  }

  #leer<T>(clave: string, valorInicial: T): T {
    try {
      const texto = localStorage.getItem(clave);
      return texto ? (JSON.parse(texto) as T) : valorInicial;
    } catch {
      return valorInicial; // almacenamiento bloqueado o corrupto: se parte de cero
    }
  }

  #guardar(clave: string, valor: unknown): void {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento la simulación dura lo que dure la pestaña.
    }
  }

  #esperar(): Promise<void> {
    return new Promise((resolver) => setTimeout(resolver, this.#latenciaMs));
  }
}

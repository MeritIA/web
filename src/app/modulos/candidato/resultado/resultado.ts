import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, type OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api, FalloDeApi } from '../../../nucleo/api/api';
import type {
  CriterioDelIntento,
  EvaluacionPropia,
  MiPuesto,
  Vacante,
} from '../../../nucleo/api/contrato';

export interface CriterioPintado extends CriterioDelIntento {
  readonly logrado: number;
}

/**
 * Mi resultado, pantalla B22.
 *
 * EL PUESTO SOLO APARECE CON EL PROCESO CERRADO
 *
 * El backend lo decide, no esta pantalla: mientras la vacante siga abierta
 * devuelve `disponible: false` con su motivo. Saber que vas tercero con el
 * proceso en marcha cambiaría cómo te comportas, y los demás todavía pueden
 * entregar. Aquí se muestra el motivo en vez de un hueco, para que el
 * candidato no crea que se rompió algo.
 *
 * LA EVIDENCIA ES LO QUE HACE DISCUTIBLE UNA NOTA
 *
 * Cada criterio trae la cita del entregable que sostiene su puntaje, igual que
 * la ve el reclutador en A07. Que las dos partes vean lo mismo es lo que
 * convierte una calificación automática en algo que se puede reclamar.
 *
 * LO QUE ESTA PANTALLA NO TIENE
 *
 * B22 promete además insignias, Mentor IA y tendencia del mercado. Ninguna de
 * las tres existe en el backend ni tiene paquete en la EDT, así que no se
 * dibujan: una pantalla con secciones vacías promete lo que no hay.
 */
@Component({
  selector: 'app-resultado',
  imports: [DatePipe],
  templateUrl: './resultado.html',
  styleUrl: './resultado.css',
})
export class Resultado implements OnInit {
  readonly idVacante = input.required<string>();

  private readonly api = inject(Api);

  protected readonly vacante = signal<Vacante | null>(null);
  protected readonly evaluaciones = signal<readonly EvaluacionPropia[]>([]);
  protected readonly puesto = signal<MiPuesto | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Mis intentos de esta vacante, del más reciente al más antiguo. */
  protected readonly intentos = computed(() => {
    const mias = this.evaluaciones().filter((e) => e.idVacante === this.idVacante());
    const mejor = mias.length === 0 ? 0 : Math.max(...mias.map((e) => e.notaFinal));

    return [...mias]
      .sort((a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime())
      .map((evaluacion) => ({
        ...evaluacion,
        esElMejor: evaluacion.notaFinal === mejor,
        criterios: evaluacion.criterios.map((c): CriterioPintado => ({
          ...c,
          logrado: c.escalaMaxima === 0 ? 0 : Math.round((c.puntaje / c.escalaMaxima) * 100),
        })),
      }));
  });

  protected readonly volverAMisRetos = '/mis-retos';

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [vacante, evaluaciones, puesto] = await Promise.all([
        firstValueFrom(this.api.get<Vacante>(`/vacantes/${this.idVacante()}`)),
        firstValueFrom(this.api.get<EvaluacionPropia[]>('/evaluaciones/mias')),
        firstValueFrom(
          this.api.get<MiPuesto>(`/evaluaciones/vacante/${this.idVacante()}/mi-puesto`),
        ),
      ]);
      this.vacante.set(vacante);
      this.evaluaciones.set(evaluaciones);
      this.puesto.set(puesto);
    } catch (fallo) {
      this.error.set(
        fallo instanceof FalloDeApi
          ? fallo.message
          : `No se pudo cargar tu resultado: ${String(fallo)}`,
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /** El motivo del backend, en palabras de la pantalla. */
  protected porQueNoHayPuesto(motivo: string): string {
    switch (motivo) {
      case 'vacante_no_cerrada':
        return 'Tu puesto aparece cuando la empresa cierre el proceso: hasta entonces hay gente que todavía puede entregar.';
      case 'sin_evaluacion':
        return 'Todavía no tienes ninguna entrega evaluada en este reto.';
      default:
        return motivo;
    }
  }
}

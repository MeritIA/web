import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API, Api, FalloDeApi } from '../../../nucleo/api/api';
import type {
  FilaDeRanking,
  IdentidadRevelada,
  ReporteDeVacante,
} from '../../../nucleo/api/contrato';

/**
 * Ranking de finalistas, pantalla A06.
 *
 * LA IDENTIDAD ESTÁ OCULTA, Y ESO ES EL PRODUCTO
 *
 * El objetivo de MeritIA es reducir el sesgo en la evaluación, y esta pantalla
 * es donde se instrumenta: «identidad oculta hasta que selecciones a quien
 * contactar». El backend ni siquiera manda el nombre en el ranking, así que
 * aquí no hay nada que esconder con CSS — no está.
 *
 * REVELAR NO ES UNA CONSULTA MÁS
 *
 * Queda auditado en el backend: quién lo hizo, cuándo y de quién. Por eso se
 * pide fila por fila y con confirmación, y por eso la pantalla dice en voz
 * alta que queda registrado ANTES de hacerlo, no después. Un botón que
 * destapa a una persona sin avisar de que deja rastro es una trampa para el
 * reclutador.
 *
 * LO REVELADO NO SE GUARDA EN NINGÚN SITIO
 *
 * Vive en memoria mientras la pantalla está abierta. Al recargar vuelve a
 * estar oculto, y volver a verlo vuelve a quedar registrado. Es lo coherente
 * con que cada revelación sea un acto.
 */
@Component({
  selector: 'app-ranking',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './ranking.html',
  styleUrl: './ranking.css',
})
export class Ranking {
  /** Llega de la ruta `/vacantes/:idVacante/ranking`. */
  readonly idVacante = input.required<string>();

  private readonly api = inject(Api);

  protected readonly reporte = signal<ReporteDeVacante | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Identidades reveladas en ESTA sesión de pantalla, por candidato. */
  protected readonly reveladas = signal<Record<string, IdentidadRevelada>>({});
  /** Fila cuya revelación se está confirmando, o null. */
  protected readonly confirmando = signal<FilaDeRanking | null>(null);
  protected readonly revelando = signal(false);

  protected readonly filas = computed(() => this.reporte()?.ranking ?? []);

  protected readonly hayRiesgo = computed(
    () => (this.reporte()?.resumen.entregasConRiesgoAlto ?? 0) > 0,
  );

  /** El CSV se descarga con la sesión del navegador: la cookie viaja sola. */
  protected readonly urlDelCsv = computed(
    () => `${API}/reportes/vacantes/${this.idVacante()}/exportar`,
  );

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.reporte.set(
        await firstValueFrom(
          this.api.get<ReporteDeVacante>(`/reportes/vacantes/${this.idVacante()}`),
        ),
      );
    } catch (fallo) {
      // Un 404 aquí significa «no existe o no es tuya»: el backend no distingue a
      // propósito, para que cambiar un identificador no confirme nada.
      this.error.set(fallo instanceof FalloDeApi ? fallo.message : 'No se pudo cargar el ranking.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected pedirConfirmacion(fila: FilaDeRanking): void {
    this.confirmando.set(fila);
  }

  protected cancelar(): void {
    this.confirmando.set(null);
  }

  protected async revelar(): Promise<void> {
    const fila = this.confirmando();
    if (!fila || this.revelando()) return;

    this.revelando.set(true);
    try {
      const identidad = await firstValueFrom(
        this.api.post<IdentidadRevelada>(
          `/reportes/vacantes/${this.idVacante()}/candidatos/${fila.idCandidato}/revelar`,
          {},
        ),
      );
      this.reveladas.update((previas) => ({ ...previas, [fila.idCandidato]: identidad }));
      this.confirmando.set(null);
    } catch (fallo) {
      this.error.set(
        fallo instanceof FalloDeApi ? fallo.message : 'No se pudo revelar la identidad.',
      );
    } finally {
      this.revelando.set(false);
    }
  }

  protected identidadDe(fila: FilaDeRanking): IdentidadRevelada | undefined {
    return this.reveladas()[fila.idCandidato];
  }

  /** `ninguno` no se pinta: solo se avisa de lo que merece una mirada. */
  protected riesgoVisible(fila: FilaDeRanking): boolean {
    return fila.riesgoInyeccion !== 'ninguno';
  }
}

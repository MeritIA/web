import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, type OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api, FalloDeApi } from '../../../nucleo/api/api';
import type { CriterioDelIntento, ReporteDeCandidato } from '../../../nucleo/api/contrato';

/** Un criterio con lo que la pantalla necesita ya calculado. */
export interface CriterioPintado extends CriterioDelIntento {
  /** 0 a 100. Lo que se logró del criterio, no la nota final. */
  readonly logrado: number;
}

/**
 * Ver entrega, pantalla A07.
 *
 * SE ENTRA DESDE UNA FILA DEL RANKING Y SIGUE SIN REVELAR A NADIE
 *
 * El backend devuelve el alias, no el nombre. Entrar al detalle de una
 * evaluación no es «contactar a esta persona», así que no destapa su
 * identidad: para eso está el botón de A06, que deja rastro.
 *
 * TODOS LOS INTENTOS, NO SOLO EL MEJOR
 *
 * El ranking muestra la nota del mejor intento. Aquí se ven todos, porque la
 * pregunta que trae a esta pantalla es «¿por qué sacó esa nota?» y la
 * respuesta a veces es «la primera vez entregó otra cosa».
 *
 * LA EVIDENCIA ES EL PRODUCTO
 *
 * Cada criterio trae la cita del entregable que sostiene su puntaje. Es lo que
 * separa una nota de un juicio: sin ella el candidato no puede discutir nada y
 * el reclutador no puede defender la decisión. Por eso la evidencia se muestra
 * entera y no recortada con puntos suspensivos.
 */
@Component({
  selector: 'app-entrega',
  imports: [DatePipe],
  templateUrl: './entrega.html',
  styleUrl: './entrega.css',
})
export class Entrega implements OnInit {
  readonly idVacante = input.required<string>();
  readonly idCandidato = input.required<string>();

  private readonly api = inject(Api);

  protected readonly reporte = signal<ReporteDeCandidato | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Intentos de más reciente a más antiguo, con sus criterios ya calculados. */
  protected readonly intentos = computed(() => {
    const r = this.reporte();
    if (!r) return [];

    return [...r.intentos]
      .sort((a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime())
      .map((intento, indice) => ({
        ...intento,
        // El mejor es el de nota más alta, no el más reciente: es el que da la
        // nota del ranking, y conviene que se vea cuál es.
        esElMejor: intento.notaFinal === Math.max(...r.intentos.map((i) => i.notaFinal)),
        numero: r.intentos.length - indice,
        criterios: intento.criterios.map((c): CriterioPintado => ({
          ...c,
          logrado: c.escalaMaxima === 0 ? 0 : Math.round((c.puntaje / c.escalaMaxima) * 100),
        })),
      }));
  });

  protected readonly volverAlRanking = computed(() => `/vacantes/${this.idVacante()}/ranking`);

  /** Entrega cuya descarga se esta pidiendo, para no repetir el clic. */
  protected readonly pidiendoArchivo = signal<string | null>(null);
  /** Si el navegador bloqueo la ventana, se ofrece el enlace a mano. */
  protected readonly enlaceDeRespaldo = signal<string | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.reporte.set(
        await firstValueFrom(
          this.api.get<ReporteDeCandidato>(
            `/reportes/vacantes/${this.idVacante()}/candidatos/${this.idCandidato()}`,
          ),
        ),
      );
    } catch (fallo) {
      this.error.set(
        fallo instanceof FalloDeApi
          ? fallo.message
          : `No se pudo cargar la entrega: ${String(fallo)}`,
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Descarga el entregable.
   *
   * NO ES UN ENLACE DIRECTO, Y ESO SE APRENDIO PULSANDOLO. `GET
   * /entregas/{id}/descarga` no devuelve el archivo: devuelve un JSON con una
   * URL firmada y temporal del almacenamiento. Un `<a href>` a esa ruta lleva
   * al usuario a mirar un JSON, no a descargar nada.
   *
   * El enlace firmado caduca, asi que se pide en el momento del clic y no al
   * pintar la pantalla: uno pedido al cargar estaria vencido cuando alguien
   * decida pulsarlo.
   *
   * Se abre con `window.open` tras un `await`, y por eso puede toparse con el
   * bloqueador de ventanas. Cuando pasa se dice y se ofrece el enlace, en vez
   * de dejar un boton que aparentemente no hace nada.
   */
  protected async descargar(idEntrega: string): Promise<void> {
    if (this.pidiendoArchivo()) return;

    this.pidiendoArchivo.set(idEntrega);
    this.enlaceDeRespaldo.set(null);
    try {
      const { url } = await firstValueFrom(
        this.api.get<{ url: string }>(`/entregas/${idEntrega}/descarga`),
      );
      if (!window.open(url, '_blank', 'noopener')) this.enlaceDeRespaldo.set(url);
    } catch (fallo) {
      this.error.set(
        fallo instanceof FalloDeApi
          ? fallo.message
          : `No se pudo pedir el archivo: ${String(fallo)}`,
      );
    } finally {
      this.pidiendoArchivo.set(null);
    }
  }

  protected riesgoVisible(riesgo: string): boolean {
    return riesgo !== 'ninguno';
  }
}

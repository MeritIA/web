import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, type OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api, FalloDeApi } from '../../../nucleo/api/api';
import type {
  AvisoDeCierre,
  ReporteDeVacante,
  ResumenDeAvisos,
  Vacante,
} from '../../../nucleo/api/contrato';

/** Un finalista con lo que esta pantalla necesita saber de él. */
export interface Finalista {
  readonly posicion: number;
  readonly alias: string;
  readonly idCandidato: string;
  readonly notaFinal: number;
  readonly contratadoEn: string | null;
  readonly aviso: AvisoDeCierre | null;
}

/**
 * Contratar y cerrar, pantalla A08.
 *
 * ES LA ÚLTIMA DEL FLUJO DE LA EMPRESA, Y LA ÚNICA QUE ESCRIBE FUERA
 *
 * Cerrar una vacante le manda un correo a cada persona que participó. Eso no
 * se deshace, así que la confirmación dice **qué recibe el candidato** antes
 * de hacerlo: el aviso no lleva la nota, ni el puesto, ni si fue seleccionada.
 * Un reclutador que cierra creyendo que el correo comunica el resultado se
 * lleva una sorpresa cuando le escriban preguntando.
 *
 * CONTRATAR NO REVELA A NADIE
 *
 * Se marca sobre el alias. Queda registrado quién lo hizo y cuándo, porque es
 * la decisión con consecuencias económicas del proceso. Para saber a quién se
 * contrató hay que revelar la identidad en A06, y eso deja su propio rastro.
 *
 * `sin_canal` NO ES UN FALLO
 *
 * Significa que no hay SMTP configurado, que es el caso normal en desarrollo.
 * Pintarlo como error haría que el equipo aprendiera a ignorar los errores de
 * esta pantalla.
 */
@Component({
  selector: 'app-cierre',
  imports: [DatePipe],
  templateUrl: './cierre.html',
  styleUrl: './cierre.css',
})
export class Cierre implements OnInit {
  readonly idVacante = input.required<string>();

  private readonly api = inject(Api);

  protected readonly vacante = signal<Vacante | null>(null);
  protected readonly reporte = signal<ReporteDeVacante | null>(null);
  protected readonly avisos = signal<readonly AvisoDeCierre[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly contratando = signal<string | null>(null);
  protected readonly confirmandoCierre = signal(false);
  protected readonly cerrando = signal(false);
  protected readonly reenviando = signal(false);
  protected readonly ultimoResumen = signal<ResumenDeAvisos | null>(null);

  protected readonly cerrada = computed(() => this.vacante()?.estado === 'cerrada');

  protected readonly finalistas = computed<Finalista[]>(() => {
    const reporte = this.reporte();
    if (!reporte) return [];

    const contratados = new Map(
      (this.vacante()?.candidatos ?? []).map((c) => [c.idCandidato, c.contratadoEn]),
    );
    const porCandidato = new Map(this.avisos().map((a) => [a.idCandidato, a]));

    return reporte.ranking.map((fila) => ({
      posicion: fila.posicion,
      alias: fila.alias,
      idCandidato: fila.idCandidato,
      notaFinal: fila.notaFinal,
      contratadoEn: contratados.get(fila.idCandidato) ?? null,
      aviso: porCandidato.get(fila.idCandidato) ?? null,
    }));
  });

  protected readonly hayContratados = computed(() =>
    this.finalistas().some((f) => f.contratadoEn !== null),
  );

  /**
   * Los que de verdad FALLARON: el servidor de correo los rechazó.
   *
   * Va aparte de los pendientes a propósito. Llamar «no salió» a un aviso que
   * solo está registrado y esperando convierte un entorno sin correo en una
   * pantalla llena de alarmas, y a las alarmas que siempre están encendidas se
   * les deja de hacer caso.
   */
  protected readonly fallidos = computed(
    () => this.avisos().filter((a) => a.estado === 'fallida').length,
  );

  /** Registrados y todavía sin enviar. No es un error: es una espera. */
  protected readonly pendientes = computed(
    () => this.avisos().filter((a) => a.estado === 'pendiente' || a.estado === 'enviando').length,
  );

  protected readonly sinCanal = computed(
    () => this.avisos().filter((a) => a.estado === 'sin_canal').length,
  );

  /** `true` cuando el entorno tiene el envío a candidatos apagado. */
  protected readonly canalApagado = computed(
    () => this.ultimoResumen()?.omitido === 'canal_apagado',
  );

  protected readonly volverAlRanking = computed(() => `/vacantes/${this.idVacante()}/ranking`);

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [vacante, reporte] = await Promise.all([
        firstValueFrom(this.api.get<Vacante>(`/vacantes/${this.idVacante()}`)),
        firstValueFrom(this.api.get<ReporteDeVacante>(`/reportes/vacantes/${this.idVacante()}`)),
      ]);
      this.vacante.set(vacante);
      this.reporte.set(reporte);

      // Los avisos solo existen con la vacante cerrada; pedirlos antes es una
      // llamada que siempre devuelve lo mismo.
      if (vacante.estado === 'cerrada') await this.cargarAvisos();
    } catch (fallo) {
      this.error.set(this.mensajeDe(fallo, 'No se pudo cargar el cierre'));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarAvisos(): Promise<void> {
    this.avisos.set(
      await firstValueFrom(
        this.api.get<AvisoDeCierre[]>(`/notificaciones/vacantes/${this.idVacante()}`),
      ),
    );
  }

  protected async contratar(finalista: Finalista): Promise<void> {
    if (this.contratando() || this.cerrada()) return;

    this.contratando.set(finalista.idCandidato);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.post<Vacante>(
          `/vacantes/${this.idVacante()}/candidatos/${finalista.idCandidato}/contratar`,
          {},
        ),
      );
      // Se recarga la vacante en vez de parchear el estado local: `contratadoEn`
      // lo pone el servidor, y mostrar una hora inventada aquí sería mentir en
      // un dato que después sale en informes.
      this.vacante.set(
        await firstValueFrom(this.api.get<Vacante>(`/vacantes/${this.idVacante()}`)),
      );
    } catch (fallo) {
      this.error.set(this.mensajeDe(fallo, 'No se pudo registrar la contratación'));
    } finally {
      this.contratando.set(null);
    }
  }

  protected async cerrar(): Promise<void> {
    if (this.cerrando()) return;

    this.cerrando.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.post<Vacante>(`/vacantes/${this.idVacante()}/cerrar`, {}));
      this.confirmandoCierre.set(false);
      // El aviso por correo lo dispara un evento, así que puede no haber
      // terminado cuando esta respuesta llega. Se recarga todo y lo que falte
      // aparecerá como pendiente, que es la verdad.
      await this.cargar();
    } catch (fallo) {
      this.error.set(this.mensajeDe(fallo, 'No se pudo cerrar la vacante'));
      this.cerrando.set(false);
    }
  }

  protected async reenviar(): Promise<void> {
    if (this.reenviando()) return;

    this.reenviando.set(true);
    this.error.set(null);
    try {
      this.ultimoResumen.set(
        await firstValueFrom(
          this.api.post<ResumenDeAvisos>(
            `/notificaciones/vacantes/${this.idVacante()}/reenviar`,
            {},
          ),
        ),
      );
      await this.cargarAvisos();
    } catch (fallo) {
      this.error.set(this.mensajeDe(fallo, 'No se pudieron reenviar los avisos'));
    } finally {
      this.reenviando.set(false);
    }
  }

  /** Cómo se lee cada estado de aviso, en palabras de la pantalla. */
  protected textoDelAviso(aviso: AvisoDeCierre | null): string {
    if (!aviso) return 'Sin aviso registrado';
    switch (aviso.estado) {
      case 'enviada':
        return 'Aviso enviado';
      case 'pendiente':
      case 'enviando':
        return 'Aviso en camino';
      case 'sin_canal':
        return 'Sin enviar: no hay correo configurado';
      default:
        return `No salió: ${aviso.ultimoError ?? 'motivo desconocido'}`;
    }
  }

  protected claseDelAviso(aviso: AvisoDeCierre | null): string {
    if (!aviso) return 'etiqueta--neutra';
    if (aviso.estado === 'enviada') return 'etiqueta--verde';
    if (aviso.estado === 'fallida') return 'etiqueta--rojo';
    return 'etiqueta--neutra';
  }

  /**
   * Traduce el codigo de `omitido` a una frase.
   *
   * El backend devuelve `canal_apagado` o `vacante_no_cerrada`, que son
   * nombres para un programa. Ensenarlos tal cual obliga al reclutador a
   * adivinar, y «canal_apagado» suena a averia cuando es una decision.
   */
  protected porQueNoSeEnvio(codigo: string): string {
    switch (codigo) {
      case 'canal_apagado':
        return (
          'el envío de correos a candidatos está apagado en este entorno. Los avisos quedan ' +
          'registrados y saldrán en cuanto se encienda: nadie se pierde.'
        );
      case 'vacante_no_cerrada':
        return 'la vacante no está cerrada.';
      case 'vacante_inexistente':
        return 'la vacante ya no existe.';
      default:
        return codigo;
    }
  }

  private mensajeDe(fallo: unknown, porDefecto: string): string {
    return fallo instanceof FalloDeApi ? fallo.message : `${porDefecto}: ${String(fallo)}`;
  }
}

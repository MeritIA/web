import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { EntregasServicio } from '../../nucleo/api/entregas.servicio';
import { accion, recursoPor } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';
import { ButtonDirective } from 'primeng/button';

/**
 * Verificación de una entrega.
 *
 * Con `soloLectura` (la empresa) muestra el estado y, si hay foto, un enlace
 * que caduca a los cinco minutos. Sin él (el candidato) ofrece las dos
 * modalidades: foto con la cámara, o sin cámara con verificación manual. Que el
 * candidato no autorice la cámara nunca lo deja sin camino: la alterna siempre
 * está.
 */
@Component({
  selector: 'app-verificacion-entrega',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, DatePipe],
  template: `
    @if (estado.datos(); as v) {
      @if (v.modalidad === 'camara') {
        <span class="micro"
          >Verificada con cámara
          @if (v.enlace) {
            · <a [href]="v.enlace" target="_blank" rel="noopener">ver foto</a>
          } @else {
            · foto eliminada
          }
          @if (v.conservarHasta && v.enlace) {
            · se borra el {{ v.conservarHasta | date: 'd MMM y' }}
          }
        </span>
      } @else if (v.modalidad === 'alterna') {
        <span class="micro">Verificación manual (sin cámara)</span>
      } @else if (soloLectura()) {
        <span class="micro">Sin verificar</span>
      } @else {
        <div class="fila acciones">
          @if (!camaraAbierta()) {
            <button type="button" pButton severity="secondary" size="small" (click)="abrirCamara()">
              Verificar con cámara
            </button>
            <button
              type="button"
              pButton
              [text]="true"
              severity="secondary"
              size="small"
              [disabled]="enviar.enviando()"
              (click)="enviar.correr('alterna')"
            >
              Prefiero sin cámara
            </button>
          } @else {
            <div class="camara">
              <video
                #video
                autoplay
                playsinline
                muted
                aria-label="Vista previa de la cámara"
              ></video>
              <div class="fila">
                <button
                  type="button"
                  pButton
                  size="small"
                  [disabled]="enviar.enviando()"
                  (click)="enviar.correr('camara')"
                >
                  {{ enviar.enviando() ? 'Enviando…' : 'Tomar foto y verificar' }}
                </button>
                <button
                  type="button"
                  pButton
                  severity="secondary"
                  size="small"
                  (click)="cerrarCamara()"
                >
                  Cancelar
                </button>
              </div>
            </div>
          }
        </div>
        @if (problema(); as texto) {
          <p class="campo__error" role="alert">{{ texto }}</p>
        }
        @if (enviar.error(); as error) {
          <p class="campo__error" role="alert">{{ error }}</p>
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .acciones {
      gap: var(--e-2);
      flex-wrap: wrap;
    }
    .camara {
      display: grid;
      gap: var(--e-2);
    }
    video {
      width: 100%;
      max-width: 320px;
      border-radius: var(--r-sm);
      background: #000;
    }
  `,
})
export class VerificacionEntrega implements OnDestroy {
  readonly idEntrega = input.required<string>();
  readonly soloLectura = input(false);

  readonly #entregas = inject(EntregasServicio);
  readonly #avisos = inject(Avisos);
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  protected readonly estado = recursoPor(this.idEntrega, (id) => this.#entregas.verificacion(id));
  protected readonly camaraAbierta = signal(false);
  protected readonly problema = signal<string | null>(null);
  #flujo: MediaStream | null = null;

  protected async abrirCamara(): Promise<void> {
    this.problema.set(null);
    try {
      this.#flujo = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      this.problema.set(
        'No pudimos usar la cámara. Revisa el permiso del navegador o elige «Prefiero sin cámara».',
      );
      return;
    }
    this.camaraAbierta.set(true);
    // El <video> existe tras el siguiente ciclo de detección de cambios.
    queueMicrotask(() => setTimeout(() => this.#conectar(), 0));
  }

  #conectar(): void {
    const video = this.video()?.nativeElement;
    if (video && this.#flujo) video.srcObject = this.#flujo;
  }

  protected cerrarCamara(): void {
    this.#flujo?.getTracks().forEach((t) => t.stop());
    this.#flujo = null;
    this.camaraAbierta.set(false);
  }

  protected readonly enviar = accion(async (modalidad: 'camara' | 'alterna') => {
    let foto: Blob | undefined;
    if (modalidad === 'camara') {
      const video = this.video()?.nativeElement;
      if (!video) throw new Error('La cámara no está abierta.');
      // El primer cuadro tarda un instante tras abrir la cámara: se espera hasta 3 s.
      for (let i = 0; i < 30 && !video.videoWidth; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!video.videoWidth) throw new Error('La cámara aún no está lista. Espera un segundo.');
      const lienzo = document.createElement('canvas');
      lienzo.width = video.videoWidth;
      lienzo.height = video.videoHeight;
      lienzo.getContext('2d')?.drawImage(video, 0, 0);
      foto = await new Promise<Blob>((ok, mal) =>
        lienzo.toBlob(
          (b) => (b ? ok(b) : mal(new Error('No se pudo tomar la foto.'))),
          'image/jpeg',
          0.85,
        ),
      );
    }
    this.estado.fijar(await this.#entregas.verificar(this.idEntrega(), modalidad, foto));
    this.cerrarCamara();
    this.#avisos.exito(
      modalidad === 'camara'
        ? 'Entrega verificada. La foto se conserva 90 días y luego se borra.'
        : 'Listo: la empresa verificará tu entrega a mano.',
    );
  });

  ngOnDestroy(): void {
    this.cerrarCamara();
  }
}

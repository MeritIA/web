import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { entorno } from '../../../entornos/entorno';
import { ButtonDirective } from 'primeng/button';

interface Resultado {
  estado: 'ok' | 'falla' | 'pendiente';
  detalle: string;
}

/**
 * Verificación técnica antes de empezar (B15): cámara, micrófono y conexión.
 *
 * Todo se comprueba de verdad en el navegador: se pide el permiso, se abre el
 * dispositivo y se cierra, y la conexión se mide contra el servidor, no contra
 * `navigator.onLine`, que solo dice si hay red local. Nada es obligatorio: quien
 * no tiene cámara entrega con la modalidad alterna.
 */
@Component({
  selector: 'app-verificacion-tecnica',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective],
  template: `
    <section class="panel tecnica" aria-labelledby="tecnica-titulo">
      <h2 id="tecnica-titulo" class="micro">Verificación técnica</h2>
      <p class="ayuda">Comprueba tu equipo antes de empezar. No es obligatoria.</p>
      <ul>
        @for (fila of filas; track fila.clave) {
          <li [class.falla]="resultados()[fila.clave].estado === 'falla'">
            <span aria-hidden="true">{{ marca(resultados()[fila.clave].estado) }}</span>
            <strong>{{ fila.texto }}</strong>
            <span class="micro">{{ resultados()[fila.clave].detalle }}</span>
          </li>
        }
      </ul>
      <button
        type="button"
        pButton
        severity="secondary"
        size="small"
        [disabled]="corriendo()"
        (click)="comprobar()"
      >
        {{ corriendo() ? 'Comprobando…' : 'Comprobar mi equipo' }}
      </button>
    </section>
  `,
  styles: `
    .tecnica {
      display: grid;
      gap: var(--e-3);
      padding: var(--e-4);
    }
    .ayuda {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    ul {
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
    }
    li {
      display: flex;
      gap: var(--e-3);
      align-items: baseline;
    }
    li.falla strong {
      color: var(--c-peligro, inherit);
    }
  `,
})
export class VerificacionTecnica {
  protected readonly filas = [
    { clave: 'camara', texto: 'Cámara' },
    { clave: 'microfono', texto: 'Micrófono' },
    { clave: 'conexion', texto: 'Conexión con MeritIA' },
  ] as const;

  protected readonly corriendo = signal(false);
  protected readonly resultados = signal<Record<'camara' | 'microfono' | 'conexion', Resultado>>({
    camara: { estado: 'pendiente', detalle: 'Sin comprobar' },
    microfono: { estado: 'pendiente', detalle: 'Sin comprobar' },
    conexion: { estado: 'pendiente', detalle: 'Sin comprobar' },
  });

  protected marca(estado: Resultado['estado']): string {
    return estado === 'ok' ? '✓' : estado === 'falla' ? '▲' : '·';
  }

  protected async comprobar(): Promise<void> {
    this.corriendo.set(true);
    const [camara, microfono, conexion] = await Promise.all([
      this.#dispositivo({ video: true }, 'Funciona'),
      this.#dispositivo({ audio: true }, 'Funciona'),
      this.#conexion(),
    ]);
    this.resultados.set({ camara, microfono, conexion });
    this.corriendo.set(false);
  }

  async #dispositivo(restricciones: MediaStreamConstraints, bien: string): Promise<Resultado> {
    try {
      const flujo = await navigator.mediaDevices.getUserMedia(restricciones);
      flujo.getTracks().forEach((t) => t.stop());
      return { estado: 'ok', detalle: bien };
    } catch {
      return {
        estado: 'falla',
        detalle: 'No disponible o sin permiso. Puedes entregar con la modalidad sin cámara.',
      };
    }
  }

  async #conexion(): Promise<Resultado> {
    const inicio = performance.now();
    try {
      const r = await fetch(`${entorno.apiBase.replace(/\/v1$/, '')}/salud`, { cache: 'no-store' });
      const ms = Math.round(performance.now() - inicio);
      if (!r.ok) return { estado: 'falla', detalle: `El servidor respondió ${r.status}.` };
      return {
        estado: ms > 1500 ? 'falla' : 'ok',
        detalle: ms > 1500 ? `Lenta: ${ms} ms. Las subidas grandes pueden tardar.` : `${ms} ms`,
      };
    } catch {
      return { estado: 'falla', detalle: 'No llegamos al servidor. Revisa tu conexión.' };
    }
  }
}

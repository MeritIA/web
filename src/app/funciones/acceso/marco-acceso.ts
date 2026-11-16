import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemaServicio } from '../../nucleo/ui/tema';
import { ButtonDirective } from 'primeng/button';
import { MuestraEvidencia } from './muestra-evidencia';

/**
 * Marco de las pantallas de cuenta.
 *
 * El acceso pedía confianza con un orbe y una promesa; ahora la enseña. A la
 * izquierda va una entrega evaluada de ejemplo —nota, criterios y cita— y a la
 * derecha el formulario, que es lo que la persona vino a completar. En móvil el
 * formulario sube al primer lugar y la muestra queda como respaldo, no como
 * antesala.
 *
 * El mismo marco sirve a acceso, registro y registro de empresa: tres puertas
 * con una sola gramática visual.
 */
@Component({
  selector: 'app-marco-acceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, MuestraEvidencia, RouterLink],
  template: `
    <main class="ingreso malla">
      <header class="cinta">
        <a class="marca" routerLink="/">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 1.5 20.5 12 12 22.5 3.5 12Z" fill="none" stroke="currentColor" />
            <path d="M12 6.5 16.8 12 12 17.5 7.2 12Z" fill="currentColor" opacity=".55" />
          </svg>
          <span class="marca__texto">
            <span class="marca__nombre"><strong>MERIT</strong><em>IA</em></span>
            <small class="micro">evaluación con evidencia</small>
          </span>
        </a>

        <div class="cinta__acciones">
          <a class="volver" routerLink="/" aria-label="Volver al inicio">
            <i class="pi pi-arrow-left" aria-hidden="true"></i>
            <span class="volver__texto">Volver al inicio</span>
          </a>

          <button
            type="button"
            pButton
            [text]="true"
            severity="secondary"
            size="small"
            (click)="tema.alternar()"
            [attr.aria-label]="
              tema.actual() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
            "
          >
            <i
              [class]="tema.actual() === 'oscuro' ? 'pi pi-sun' : 'pi pi-moon'"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </header>

      <div class="cuerpo">
        <section class="formulario" aria-label="Formulario de cuenta">
          <div class="tarjeta">
            <ng-content />
          </div>
          <p class="legal micro">
            <span>© {{ anio }} MeritIA</span>
            <span>Ley 1581 de 2012 · datos cifrados</span>
          </p>
        </section>

        <aside class="escaparate" aria-label="Cómo se ve una entrega evaluada">
          <p class="micro micro--acento">evaluación técnica con evidencia</p>
          <h2 class="titular">Evidencia verificable.<br />Decisión defendible.</h2>
          <p class="bajada">
            El mismo reto y la misma rúbrica para todos. La nota llega con el desglose por criterio
            y la cita exacta que la justifica.
          </p>
          <app-muestra-evidencia />
        </aside>
      </div>
    </main>
  `,
  styles: `
    .ingreso {
      display: flex;
      flex-direction: column;
      gap: var(--e-6);
      min-height: 100dvh;
      padding: var(--e-4) var(--e-4) var(--e-6);
    }
    .cinta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3) var(--e-4);
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding-bottom: var(--e-3);
      border-bottom: 1px solid var(--c-borde);
    }
    .marca {
      display: inline-flex;
      gap: var(--e-3);
      align-items: center;
      min-height: 44px;
      color: var(--c-texto);
      text-decoration: none;
      white-space: nowrap;
    }
    .marca__texto {
      display: grid;
      line-height: 1.2;
    }
    .marca__nombre {
      display: flex;
    }
    .marca strong,
    .marca em {
      font-size: var(--t-menor);
      font-weight: var(--peso-fuerte);
      letter-spacing: 0.22em;
    }
    .marca em {
      font-style: normal;
      color: var(--c-acento);
    }
    .marca small {
      font-size: 0.6rem;
    }
    .cinta__acciones {
      display: flex;
      gap: var(--e-2);
      align-items: center;
    }
    .volver {
      display: inline-flex;
      gap: var(--e-2);
      align-items: center;
      min-height: 44px;
      padding: 0 var(--e-3);
      border-radius: var(--r-pill);
      color: var(--c-texto-suave);
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      letter-spacing: var(--tracking-micro);
      text-transform: uppercase;
      text-decoration: none;
      transition:
        color var(--mov) var(--curva),
        background var(--mov) var(--curva);
    }
    .volver:hover {
      color: var(--c-texto);
      background: var(--c-neutro-tenue);
    }
    .cuerpo {
      display: grid;
      flex: 1;
      grid-template-columns: minmax(0, 1.06fr) minmax(0, 0.94fr);
      gap: var(--e-7);
      align-items: center;
      width: 100%;
      max-width: var(--ancho-contenido);
      margin: 0 auto;
    }
    .formulario {
      display: grid;
      order: 2;
      gap: var(--e-3);
      justify-self: end;
      width: 100%;
      max-width: 460px;
    }
    .tarjeta {
      padding: var(--e-5);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-lg);
      background: color-mix(in srgb, var(--c-superficie) 94%, transparent);
      box-shadow: var(--c-sombra);
      backdrop-filter: blur(12px);
    }
    .legal {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-1) var(--e-4);
      justify-content: space-between;
      padding: 0 var(--e-2);
      font-size: 0.62rem;
    }
    .escaparate {
      display: grid;
      order: 1;
      gap: var(--e-4);
      align-content: center;
      justify-self: start;
      width: 100%;
      max-width: 580px;
    }
    .titular {
      font-size: var(--t-1);
    }
    .bajada {
      max-width: 46ch;
      color: var(--c-texto-suave);
      font-size: var(--t-cuerpo);
    }
    @media (max-width: 960px) {
      .cuerpo {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--e-6);
        align-items: start;
        padding-top: var(--e-3);
      }
      .formulario,
      .escaparate {
        order: 0;
        justify-self: center;
        max-width: 560px;
      }
    }
    @media (max-width: 680px) {
      .ingreso {
        gap: var(--e-5);
        padding: var(--e-3) var(--e-3) var(--e-5);
      }
      .marca small {
        display: none;
      }
      .tarjeta {
        padding: var(--e-4);
      }
      .titular {
        font-size: var(--t-2);
      }
    }
    @media (max-width: 520px) {
      .volver__texto {
        display: none;
      }
      .bajada {
        display: none;
      }
      .escaparate {
        gap: var(--e-3);
      }
    }
  `,
})
export class MarcoAcceso {
  protected readonly tema = inject(TemaServicio);
  protected readonly anio = new Date().getFullYear();
}

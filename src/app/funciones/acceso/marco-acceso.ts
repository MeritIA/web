import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TemaServicio } from '../../nucleo/ui/tema';
import { Aparecer } from '../../compartido/ui/aparecer';
import { OrbeFluido } from '../../compartido/ui/orbe-fluido';
import { ButtonDirective } from 'primeng/button';

/**
 * La portada de la aplicación. Es lo primero que ve un candidato invitado, y
 * su único trabajo es explicar en una frase dónde está antes de pedirle datos.
 */
@Component({
  selector: 'app-marco-acceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, OrbeFluido, Aparecer],
  template: `
    <div class="escena malla">
      <button
        type="button"
        pButton
        [text]="true"
        severity="secondary"
        size="small"
        class="tema"
        (click)="tema.alternar()"
        [attr.aria-label]="
          tema.actual() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
        "
      >
        <i [class]="tema.actual() === 'oscuro' ? 'pi pi-sun' : 'pi pi-moon'" aria-hidden="true"></i>
      </button>

      <section class="discurso">
        <ui-orbe-fluido class="orbe" tamano="clamp(88px, 18vw, 180px)" />
        <p class="micro">MeritIA · evaluación técnica</p>
        <h1>
          Evidencia verificable.<br />
          Decisión defendible.
        </h1>
        <p class="bajada lectura">
          Cada candidato resuelve el mismo ejercicio y se califica contra la misma rúbrica. La nota
          llega con el desglose por criterio y la cita exacta que la justifica.
        </p>
        <ul class="puntos">
          <li [appAparecer]="1">
            <span class="micro">01</span> Rúbricas con peso y escala, versionadas.
          </li>
          <li [appAparecer]="2">
            <span class="micro">02</span> Calificación con evidencia, nunca un número suelto.
          </li>
          <li [appAparecer]="3"><span class="micro">03</span> Ranking consolidado por vacante.</li>
        </ul>
      </section>

      <section class="formulario">
        <ng-content />
      </section>
    </div>
  `,
  styles: `
    .escena {
      display: grid;
      gap: var(--e-7);
      align-items: center;
      min-height: 100dvh;
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: var(--e-6) var(--e-4);
      grid-template-columns: 1.1fr 0.9fr;
    }
    .escena > * {
      min-width: 0;
    }
    .orbe {
      margin-bottom: var(--e-3);
    }
    .tema {
      position: absolute;
      top: var(--e-4);
      right: var(--e-4);
    }
    .discurso {
      display: grid;
      gap: var(--e-4);
      align-content: center;
    }
    h1 {
      font-size: clamp(2.2rem, 1.2rem + 4.4vw, 5.6rem);
      overflow-wrap: anywhere;
    }
    .bajada {
      color: var(--c-texto-suave);
    }
    .puntos {
      display: grid;
      gap: var(--e-3);
      margin-top: var(--e-3);
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
    .puntos li {
      display: grid;
      grid-template-columns: 2.5rem 1fr;
      align-items: baseline;
      padding-top: var(--e-3);
      border-top: 1px solid var(--c-borde);
    }
    .formulario {
      justify-self: center;
      width: min(420px, 100%);
    }
    @media (max-width: 900px) {
      .escena {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--e-6);
      }
      .puntos {
        display: none;
      }
    }
    /* Móvil: el formulario es lo que la persona vino a usar, así que sube. El orbe y la bajada
       siguen en pantallas amplias, donde sobra espacio. */
    @media (max-width: 600px) {
      .escena {
        align-items: start;
        gap: var(--e-5);
        padding-top: var(--e-7);
      }
      .orbe,
      .bajada {
        display: none;
      }
      h1 {
        font-size: clamp(1.9rem, 8.5vw, 2.4rem);
      }
    }
  `,
})
export class MarcoAcceso {
  protected readonly tema = inject(TemaServicio);
}

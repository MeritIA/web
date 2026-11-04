import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TemaServicio } from '../../nucleo/ui/tema';

/**
 * La portada de la aplicación. Es lo primero que ve un candidato invitado, y
 * su único trabajo es explicar en una frase dónde está antes de pedirle datos.
 */
@Component({
  selector: 'app-marco-acceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="escena malla">
      <button
        type="button"
        class="btn btn--sm btn--fantasma tema"
        (click)="tema.alternar()"
        [attr.aria-label]="
          tema.actual() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
        "
      >
        {{ tema.actual() === 'oscuro' ? '◐' : '◑' }}
      </button>

      <section class="discurso">
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
          <li><span class="micro">01</span> Rúbricas con peso y escala, versionadas.</li>
          <li><span class="micro">02</span> Calificación con evidencia, nunca un número suelto.</li>
          <li><span class="micro">03</span> Ranking consolidado por vacante.</li>
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
      font-size: var(--t-display);
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
        grid-template-columns: 1fr;
        gap: var(--e-6);
      }
      .puntos {
        display: none;
      }
    }
  `,
})
export class MarcoAcceso {
  protected readonly tema = inject(TemaServicio);
}

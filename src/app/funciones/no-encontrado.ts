import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sesion, inicioDe } from '../nucleo/sesion/sesion';

@Component({
  selector: 'app-no-encontrado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="escena malla">
      <span class="micro">error 404</span>
      <h1>Esta página no existe</h1>
      <p class="lectura">
        O existe y no es tuya. MeritIA responde lo mismo en ambos casos: distinguirlos permitiría
        averiguar qué hay dentro probando direcciones.
      </p>
      <a [routerLink]="destino()" class="btn btn--primario">Volver a lo mío</a>
    </div>
  `,
  styles: `
    .escena {
      display: grid;
      gap: var(--e-4);
      place-content: center;
      justify-items: center;
      min-height: 100dvh;
      padding: var(--e-6);
      text-align: center;
    }
    h1 {
      font-size: var(--t-display);
    }
    p {
      color: var(--c-texto-suave);
    }
  `,
})
export class NoEncontrado {
  readonly #sesion = inject(Sesion);
  protected readonly destino = computed(() =>
    this.#sesion.autenticado() ? inicioDe(this.#sesion.rol()!) : '/acceso',
  );
}

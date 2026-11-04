import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { PagosServicio, UMBRAL_DE_RETIRO } from '../../nucleo/api/pagos.servicio';
import { accion, recurso } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';

const METODOS = ['Nequi', 'Daviplata', 'Bancolombia'] as const;

/**
 * Remuneración por reto, SIMULADA.
 *
 * Cada reto evaluado abona entre 40.000 y 100.000 según la nota. El saldo se
 * acumula y solo se puede retirar al llegar a 200.000. No se mueve dinero:
 * el backend no tiene pagos (decisión de alcance del 02/11) y esta pantalla lo
 * dice abiertamente para que nadie la confunda con un cobro real.
 */
@Component({
  selector: 'app-mis-pagos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, Campo],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">remuneración por reto · simulación</span>
      <h1>Mis pagos</h1>
      <p class="lectura ayuda">
        Esto es una emulación: no se mueve dinero real. Sirve para ver cómo funcionaría el flujo de
        acumulación y retiro.
      </p>
    </header>

    <section class="panel saldo" aria-labelledby="saldo-titulo">
      <span id="saldo-titulo" class="micro">saldo acumulado</span>
      <p class="saldo__cifra">
        {{ pagos.saldo() | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO' }}
      </p>

      <div
        class="barra"
        role="progressbar"
        aria-label="Avance hacia el mínimo de retiro"
        [attr.aria-valuenow]="porcentaje()"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span [style.width.%]="porcentaje()"></span>
      </div>

      @if (pagos.puedeRetirar()) {
        <p>
          Ya llegaste al mínimo de
          {{ umbral | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO' }}. Puedes retirar todo
          tu saldo.
        </p>
      } @else {
        <p>
          Te faltan
          <strong>{{
            pagos.faltante() | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO'
          }}</strong>
          para poder retirar (mínimo
          {{ umbral | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO' }}).
        </p>
      }
    </section>

    @if (pagos.puedeRetirar()) {
      <form class="panel pila" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        <h2>Retirar</h2>
        <ui-campo etiqueta="Dónde recibirlo" para="metodo" [control]="formulario.controls.metodo">
          <select id="metodo" class="control" formControlName="metodo">
            @for (m of metodos; track m) {
              <option [value]="m">{{ m }}</option>
            }
          </select>
        </ui-campo>
        <ui-campo
          etiqueta="Número de cuenta o celular"
          para="numero"
          [control]="formulario.controls.numero"
        >
          <input
            id="numero"
            class="control"
            formControlName="numero"
            inputmode="numeric"
            autocomplete="off"
          />
        </ui-campo>
        <button type="submit" class="btn btn--primario" [disabled]="retirar.enviando()">
          Retirar {{ pagos.saldo() | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO' }}
        </button>
      </form>
    }

    <section class="panel pila" aria-labelledby="abonos-titulo">
      <h2 id="abonos-titulo">Retos que te han pagado</h2>
      @if (pagos.abonos().length > 0) {
        <ul class="lista">
          @for (a of pagos.abonos(); track a.clave) {
            <li class="fila fila--entre">
              <span>
                Nota {{ a.nota }}/100
                <span class="micro">· {{ a.fecha | date: 'd MMM y' }}</span>
              </span>
              <strong
                >+{{ a.monto | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO' }}</strong
              >
            </li>
          }
        </ul>
      }
    </section>

    @if (pagos.retiros().length > 0) {
      <section class="panel pila" aria-labelledby="retiros-titulo">
        <h2 id="retiros-titulo">Retiros</h2>
        <ul class="lista">
          @for (r of pagos.retiros(); track r.id) {
            <li class="fila fila--entre">
              <span>
                {{ r.destino }}
                <span class="micro">· {{ r.fecha | date: 'd MMM y, HH:mm' }} · simulado</span>
              </span>
              <strong
                >−{{ r.monto | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO' }}</strong
              >
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .saldo {
      display: grid;
      gap: var(--e-3);
      margin-bottom: var(--e-4);
    }
    .saldo__cifra {
      font-size: 2.5rem;
      font-weight: var(--peso-fuerte);
      margin: 0;
    }
    .barra {
      height: 8px;
      border-radius: var(--r-pill);
      background: var(--c-borde);
      overflow: hidden;
    }
    .barra span {
      display: block;
      height: 100%;
      background: var(--c-acento);
    }
    .lista {
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    section,
    form {
      margin-bottom: var(--e-4);
    }
  `,
})
export class MisPagos {
  protected readonly pagos = inject(PagosServicio);
  readonly #avisos = inject(Avisos);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly umbral = UMBRAL_DE_RETIRO;
  protected readonly metodos = METODOS;
  protected readonly cargado = recurso(() => this.pagos.actualizar());
  protected readonly porcentaje = computed(() =>
    Math.min(100, Math.round((this.pagos.saldo() / UMBRAL_DE_RETIRO) * 100)),
  );

  protected readonly formulario = this.#fb.group({
    metodo: [METODOS[0] as string, [Validators.required]],
    numero: ['', [Validators.required, Validators.pattern(/^\d{7,20}$/)]],
  });

  protected readonly retirar = accion(async () => {
    const { metodo, numero } = this.formulario.getRawValue();
    const retiro = this.pagos.retirar(`${metodo} ••••${numero.slice(-4)}`);
    this.formulario.reset({ metodo, numero: '' });
    this.#avisos.exito(`Retiro simulado de ${retiro.monto.toLocaleString('es-CO')} registrado.`);
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.retirar.correr();
  }
}

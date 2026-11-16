import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { SECTORES, type Sector } from '../../nucleo/api/modelos';
import { accion } from '../../nucleo/estado/recurso';
import { Sesion, inicioDe } from '../../nucleo/sesion/sesion';
import { Avisos } from '../../nucleo/ui/avisos';
import { MarcoAcceso } from './marco-acceso';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

/**
 * Auto-registro de una empresa (A01).
 *
 * Crea la empresa y a su primer administrador de una vez. El NIT es obligatorio
 * y el backend comprueba su dígito de verificación; la validación contra la
 * Cámara de Comercio es una integración externa que no existe todavía.
 *
 * El formulario es largo para caber en una pantalla, así que se parte en dos
 * pasos que se deslizan: primero la empresa, luego el administrador. Es el
 * mismo formulario por debajo; solo cambia lo que se ve.
 */
@Component({
  selector: 'app-registro-empresa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, InputText, MarcoAcceso, ReactiveFormsModule, RouterLink, Campo],
  template: `
    <app-marco-acceso>
      <form class="pila" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        <header class="pila pila--sm">
          <span class="micro">crear cuenta · empresa</span>
          <h1>Registra tu empresa</h1>
          <p class="entrada">
            {{
              paso() === 1
                ? 'Primero, los datos de tu empresa.'
                : 'Ahora, tu cuenta de administrador. Tú la crearás y tú la gestionarás.'
            }}
          </p>
        </header>

        <div class="pasos" [attr.aria-live]="'polite'">
          <div class="pasos__indicador" aria-hidden="true">
            <span>Paso {{ paso() }} de 2</span>
            <div class="pasos__barra">
              <div class="pasos__progreso" [style.width.%]="paso() * 50"></div>
            </div>
          </div>

          <div class="pasos__ventana">
            <div
              class="pasos__pista"
              [style.transform]="'translateX(-' + (paso() - 1) * 50 + '%)'"
            >
              <div class="pasos__panel" [attr.inert]="paso() !== 1 ? '' : null">
                <ui-campo
                  etiqueta="Nombre de la empresa"
                  para="nombreEmpresa"
                  [control]="formulario.controls.nombreEmpresa"
                >
                  <input
                    id="nombreEmpresa"
                    type="text"
                    pInputText
                    formControlName="nombreEmpresa"
                    autocomplete="organization"
                  />
                </ui-campo>

                <ui-campo etiqueta="Sector" para="sector" [control]="formulario.controls.sector">
                  <select id="sector" pInputText formControlName="sector">
                    @for (sector of sectores; track sector) {
                      <option [value]="sector">{{ sector }}</option>
                    }
                  </select>
                </ui-campo>

                <ui-campo
                  etiqueta="NIT"
                  para="nit"
                  ayuda="Con dígito de verificación, por ejemplo 890903938-8."
                  [control]="formulario.controls.nit"
                >
                  <input id="nit" type="text" pInputText formControlName="nit" inputmode="numeric" />
                </ui-campo>

                <button type="button" class="avanzar" pButton [fluid]="true" (click)="avanzar()">
                  Continuar <i class="pi pi-arrow-right" aria-hidden="true"></i>
                </button>
              </div>

              <div class="pasos__panel" [attr.inert]="paso() !== 2 ? '' : null">
                <ui-campo
                  etiqueta="Tu nombre completo"
                  para="nombre"
                  [control]="formulario.controls.nombreCompleto"
                >
                  <input
                    id="nombre"
                    type="text"
                    pInputText
                    formControlName="nombreCompleto"
                    autocomplete="name"
                  />
                </ui-campo>

                <ui-campo etiqueta="Correo" para="correo" [control]="formulario.controls.correo">
                  <input
                    id="correo"
                    type="email"
                    pInputText
                    formControlName="correo"
                    autocomplete="username"
                    inputmode="email"
                  />
                </ui-campo>

                <ui-campo
                  etiqueta="Contraseña"
                  para="contrasena"
                  ayuda="Mínimo 12 caracteres. Serás el administrador de la empresa y podrás crear a tus reclutadores."
                  [control]="formulario.controls.contrasena"
                >
                  <input
                    id="contrasena"
                    type="password"
                    pInputText
                    formControlName="contrasena"
                    autocomplete="new-password"
                  />
                </ui-campo>

                @if (registrar.error(); as error) {
                  <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
                }

                <div class="pasos__acciones">
                  <button type="button" class="volver-paso" pButton [text]="true" (click)="paso.set(1)">
                    <i class="pi pi-arrow-left" aria-hidden="true"></i> Volver
                  </button>
                  <button
                    class="enviar"
                    type="submit"
                    pButton
                    [fluid]="true"
                    [disabled]="registrar.enviando()"
                  >
                    {{ registrar.enviando() ? 'Registrando…' : 'Registrar empresa' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p class="pie">¿Ya tienes cuenta? <a routerLink="/acceso">Entra</a>.</p>
      </form>
    </app-marco-acceso>
  `,
  styles: `
    h1 {
      font-size: var(--t-2);
    }
    .entrada {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .pasos {
      display: grid;
      gap: var(--e-3);
    }
    .pasos__indicador {
      display: grid;
      gap: var(--e-1);
      font-size: var(--t-micro);
      color: var(--c-texto-tenue);
      font-family: var(--fuente-mono);
      letter-spacing: var(--tracking-micro);
      text-transform: uppercase;
    }
    .pasos__barra {
      height: 4px;
      border-radius: var(--r-pill);
      background: var(--c-neutro-tenue);
      overflow: hidden;
    }
    .pasos__progreso {
      height: 100%;
      border-radius: inherit;
      background: var(--c-acento);
      transition: width var(--mov) var(--curva);
    }
    .pasos__ventana {
      overflow: hidden;
      border-radius: var(--r-md);
    }
    .pasos__pista {
      display: flex;
      width: 200%;
      transition: transform var(--mov-lento) var(--curva);
    }
    .pasos__panel {
      width: 50%;
      flex: none;
      display: grid;
      gap: var(--e-4);
      padding: 0 var(--e-1);
    }
    .avanzar {
      justify-content: space-between;
      min-height: 44px;
      padding-inline: var(--e-4);
      margin-top: var(--e-2);
    }
    .pasos__acciones {
      display: grid;
      gap: var(--e-2);
      margin-top: var(--e-2);
    }
    .enviar {
      justify-content: space-between;
      min-height: 44px;
      padding-inline: var(--e-4);
    }
    .volver-paso {
      justify-content: center;
      min-height: 40px;
    }
    .pie {
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
    @media (prefers-reduced-motion: reduce) {
      .pasos__pista {
        transition: none;
      }
    }
  `,
})
export class RegistroEmpresa {
  readonly #sesion = inject(Sesion);
  readonly #router = inject(Router);
  readonly #avisos = inject(Avisos);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly paso = signal(1);
  protected readonly sectores = SECTORES;

  protected readonly formulario = this.#fb.group({
    nombreEmpresa: ['', [Validators.required, Validators.minLength(2)]],
    sector: ['tecnologia' as Sector, [Validators.required]],
    // Forma, no cálculo: el dígito de verificación lo comprueba el backend.
    nit: ['', [Validators.required, Validators.pattern(/^[\d.\s]{8,18}-\s?\d$/)]],
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(12)]],
  });

  protected avanzar(): void {
    for (const campo of ['nombreEmpresa', 'sector', 'nit']) {
      this.formulario.get(campo)?.markAsTouched();
    }
    if (['nombreEmpresa', 'sector', 'nit'].some((campo) => this.formulario.get(campo)?.invalid)) {
      return;
    }
    this.paso.set(2);
  }

  protected readonly registrar = accion(async () => {
    const usuario = await this.#sesion.registrarEmpresa(this.formulario.getRawValue());
    this.#avisos.exito('Empresa registrada. Ya puedes crear tu primer ejercicio.');
    await this.#router.navigateByUrl(inicioDe(usuario.rol), { replaceUrl: true });
  });

  protected enviar(): void {
    if (this.paso() === 1) {
      this.avanzar();
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.registrar.correr();
  }
}

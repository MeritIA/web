import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { accion } from '../../nucleo/estado/recurso';
import { Sesion, inicioDe } from '../../nucleo/sesion/sesion';
import { MarcoAcceso } from './marco-acceso';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-acceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, InputText, MarcoAcceso, ReactiveFormsModule, RouterLink, Campo],
  template: `
    <app-marco-acceso>
      <form
        class="pila"
        [formGroup]="formulario"
        (ngSubmit)="enviar()"
        [attr.aria-busy]="entrar.enviando()"
        novalidate
      >
        <header class="pila pila--sm">
          <span class="micro">entrar</span>
          <h1>Accede a tu cuenta</h1>
          <p class="entrada">Tu correo y tu contraseña. Nada más.</p>
        </header>

        @if (expirada()) {
          <p class="nota-sesion" role="status">
            Tu sesión expiró por seguridad. Vuelve a entrar para continuar donde estabas.
          </p>
        }

        <ui-campo etiqueta="Correo" para="correo" [control]="formulario.controls.correo">
          <input
            id="correo"
            type="email"
            pInputText
            formControlName="correo"
            autocomplete="username"
            inputmode="email"
            autocapitalize="none"
            spellcheck="false"
            [attr.aria-invalid]="
              formulario.controls.correo.touched && formulario.controls.correo.invalid
            "
          />
        </ui-campo>

        <ui-campo
          etiqueta="Contraseña"
          para="contrasena"
          [control]="formulario.controls.contrasena"
        >
          <div class="contrasena">
            <input
              id="contrasena"
              [type]="verContrasena() ? 'text' : 'password'"
              pInputText
              formControlName="contrasena"
              autocomplete="current-password"
              [attr.aria-invalid]="
                formulario.controls.contrasena.touched && formulario.controls.contrasena.invalid
              "
            />
            <button
              type="button"
              class="ojo"
              [attr.aria-label]="verContrasena() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              [attr.aria-pressed]="verContrasena()"
              (click)="verContrasena.set(!verContrasena())"
            >
              <i
                class="pi"
                [class.pi-eye]="!verContrasena()"
                [class.pi-eye-slash]="verContrasena()"
                aria-hidden="true"
              ></i>
            </button>
          </div>
        </ui-campo>

        @if (entrar.error(); as error) {
          <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
        }

        <button class="enviar" type="submit" pButton [fluid]="true" [disabled]="entrar.enviando()">
          <span>{{ entrar.enviando() ? 'Entrando…' : 'Entrar' }}</span>
          @if (!entrar.enviando()) {
            <i class="pi pi-arrow-right" aria-hidden="true"></i>
          }
        </button>

        <div class="altas">
          <p class="micro">¿primera vez aquí?</p>
          <a routerLink="/registro">
            <span>Crear cuenta de candidato</span>
            <i class="pi pi-arrow-right" aria-hidden="true"></i>
          </a>
          <a routerLink="/registro-empresa">
            <span>Registrar mi empresa</span>
            <i class="pi pi-arrow-right" aria-hidden="true"></i>
          </a>
          <p class="nota-add">Las demás cuentas de tu empresa las crea su administrador.</p>
        </div>
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
    .nota-sesion {
      padding: var(--e-3);
      border: 1px solid color-mix(in srgb, var(--c-aviso) 40%, transparent);
      border-radius: var(--r-md);
      background: var(--c-aviso-tenue);
      color: var(--c-aviso);
      font-size: var(--t-menor);
    }
    .contrasena {
      position: relative;
    }
    .contrasena input {
      width: 100%;
      padding-right: 2.9rem;
    }
    .ojo {
      position: absolute;
      top: 50%;
      right: var(--e-1);
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: var(--r-pill);
      background: transparent;
      color: var(--c-texto-tenue);
      transform: translateY(-50%);
      transition:
        color var(--mov) var(--curva),
        background var(--mov) var(--curva);
    }
    .ojo:hover {
      color: var(--c-texto);
      background: var(--c-neutro-tenue);
    }
    .enviar {
      justify-content: space-between;
      min-height: 44px;
      padding-inline: var(--e-4);
    }
    .altas {
      display: grid;
      gap: var(--e-2);
      margin-top: var(--e-3);
      padding-top: var(--e-4);
      border-top: 1px solid var(--c-borde);
    }
    .altas a {
      display: flex;
      gap: var(--e-3);
      align-items: center;
      justify-content: space-between;
      min-height: 44px;
      padding: 0 var(--e-3);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
      color: var(--c-texto);
      font-size: var(--t-menor);
      text-decoration: none;
      transition:
        background var(--mov) var(--curva),
        border-color var(--mov) var(--curva);
    }
    .altas a:hover {
      border-color: var(--c-borde-fuerte);
      background: var(--c-neutro-tenue);
    }
    .altas a i {
      color: var(--c-texto-tenue);
      font-size: var(--t-micro);
    }
    .nota-add {
      color: var(--c-texto-tenue);
      font-size: var(--t-micro);
      line-height: 1.45;
    }
    @media (max-width: 380px) {
      .tarjeta {
        padding: var(--e-3);
      }
    }
  `,
})
export class Acceso {
  /** Llegan por `withComponentInputBinding`: la URL recuerda a dónde iba. */
  readonly destino = input<string>();
  readonly expirada = input<string>();

  readonly #sesion = inject(Sesion);
  readonly #router = inject(Router);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly verContrasena = signal(false);

  protected readonly formulario = this.#fb.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]],
  });

  protected readonly entrar = accion(async () => {
    const usuario = await this.#sesion.entrar(this.formulario.getRawValue());
    await this.#router.navigateByUrl(this.destino() ?? inicioDe(usuario.rol), { replaceUrl: true });
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.entrar.correr();
  }
}

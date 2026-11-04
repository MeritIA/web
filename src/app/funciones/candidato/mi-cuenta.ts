import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstadoRecurso, Panel } from '../../compartido/ui/basicos';
import { Confirmaciones } from '../../compartido/ui/confirmacion';
import { ReportesServicio } from '../../nucleo/api/reportes.servicio';
import { ConsentimientosServicio } from '../../nucleo/api/consentimientos.servicio';
import type { Permiso } from '../../nucleo/api/modelos';
import { accion, recurso } from '../../nucleo/estado/recurso';
import { Sesion } from '../../nucleo/sesion/sesion';
import { Avisos } from '../../nucleo/ui/avisos';

/**
 * Mi cuenta: quién soy para la plataforma y qué permito hacer con mis datos.
 *
 * Los textos de cada permiso los pone el backend, no esta pantalla: así lo que
 * se lee aquí es literalmente lo que quedó registrado como aviso aceptado.
 */
@Component({
  selector: 'app-mi-cuenta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, EstadoRecurso, Panel, ReactiveFormsModule],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">cuenta y privacidad</span>
      <h1>Mi cuenta</h1>
    </header>

    <ui-panel antetitulo="para que te inviten" titulo="Tu identificador">
      <p class="ayuda">
        Si una empresa quiere invitarte a una prueba, puede usar tu correo o este código. Compártelo
        si prefieres no dar tu correo.
      </p>
      <div class="identificador">
        <code>{{ sesion.usuario()?.id }}</code>
        <button type="button" class="btn btn--sm" (click)="copiar()">
          {{ copiado() ? 'Copiado' : 'Copiar' }}
        </button>
      </div>
    </ui-panel>

    <ui-panel antetitulo="Ley 1581 de 2012" titulo="Tus permisos sobre los datos">
      <ui-recurso
        [cargando]="permisos.cargando() && !permisos.datos()"
        [error]="permisos.error()"
        [filas]="3"
        (reintentar)="permisos.recargar()"
      />

      @if (permisos.datos(); as c) {
        <ul class="lista">
          @for (permiso of vigilados(c.permisos); track permiso.tipo) {
            <li class="permiso">
              <div class="pila pila--sm">
                <strong>{{ permiso.titulo }}</strong>
                <p class="ayuda">{{ permiso.descripcion }}</p>
                <p class="micro">
                  @if (permiso.porOmision) {
                    Nunca lo decidiste: vale el valor inicial.
                  } @else if (permiso.decididoEn) {
                    Decidido el {{ permiso.decididoEn | date: 'd MMM y, HH:mm' }}
                  }
                </p>
                @if (permiso.concedido && permiso.efecto) {
                  <p class="micro efecto">Si lo retiras: {{ permiso.efecto }}</p>
                }
              </div>
              <label class="interruptor">
                <input
                  type="checkbox"
                  role="switch"
                  [checked]="permiso.concedido"
                  [disabled]="cambiar.enviando()"
                  [attr.aria-label]="permiso.titulo"
                  (change)="alternar(permiso, $any($event.target).checked)"
                />
                <span>{{ permiso.concedido ? 'Permitido' : 'No permitido' }}</span>
              </label>
            </li>
          }
        </ul>
        <p class="micro">Versión del aviso: {{ c.versionDelAviso }}</p>
      }

      @if (cambiar.error(); as error) {
        <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
      }
    </ui-panel>

    <ui-panel antetitulo="Ley 1581 de 2012" titulo="Tus datos">
      <p class="ayuda">
        Puedes llevarte una copia de todo lo que guardamos de ti, o eliminar tu cuenta.
      </p>
      <div class="fila">
        <button
          type="button"
          class="btn btn--sm"
          [disabled]="descargar.enviando()"
          (click)="descargar.correr()"
        >
          {{ descargar.enviando() ? 'Preparando…' : 'Descargar mis datos' }}
        </button>
      </div>
      @if (descargar.error(); as error) {
        <p class="campo__error" role="alert">{{ error }}</p>
      }

      <form class="eliminar" [formGroup]="borrado" (ngSubmit)="pedirEliminar()" novalidate>
        <label class="campo__etiqueta" for="contrasena-borrado">
          Para eliminar tu cuenta, confirma tu contraseña
        </label>
        <input
          id="contrasena-borrado"
          type="password"
          class="control"
          formControlName="contrasena"
          autocomplete="current-password"
        />
        <p class="micro">
          Tu nombre y tu correo se borran y la cuenta no vuelve a abrirse. Tus entregas y
          evaluaciones ya hechas se conservan sin tu nombre, porque son parte del expediente de la
          empresa. No se deshace.
        </p>
        @if (eliminar.error(); as error) {
          <p class="campo__error" role="alert">{{ error }}</p>
        }
        <button
          type="submit"
          class="btn btn--sm btn--peligro"
          [disabled]="borrado.invalid || eliminar.enviando()"
        >
          Eliminar mi cuenta
        </button>
      </form>
    </ui-panel>
  `,
  styles: `
    .eliminar {
      display: grid;
      gap: var(--e-2);
      max-width: 420px;
      margin-top: var(--e-4);
    }
    :host {
      display: grid;
      gap: var(--e-4);
    }
    h1 {
      font-size: var(--t-1);
    }
    .ayuda {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .identificador {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      align-items: center;
      margin-top: var(--e-3);
    }
    code {
      padding: var(--e-2) var(--e-3);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
      background: var(--c-superficie-viva);
      font-family: var(--fuente-mono);
      font-size: var(--t-menor);
      word-break: break-all;
    }
    .lista {
      display: grid;
      gap: var(--e-4);
      margin: 0 0 var(--e-4);
      padding: 0;
      list-style: none;
    }
    .permiso {
      display: flex;
      gap: var(--e-4);
      align-items: start;
      justify-content: space-between;
      padding-bottom: var(--e-4);
      border-bottom: 1px solid var(--c-borde);
    }
    .efecto {
      color: var(--c-texto-tenue);
    }
    .interruptor {
      display: flex;
      gap: var(--e-2);
      align-items: center;
      white-space: nowrap;
      font-size: var(--t-menor);
      cursor: pointer;
    }
    .interruptor input {
      width: 18px;
      height: 18px;
      accent-color: var(--c-acento);
    }
  `,
})
export class MiCuenta {
  protected readonly sesion = inject(Sesion);
  readonly #servicio = inject(ConsentimientosServicio);
  readonly #avisos = inject(Avisos);
  readonly #reportes = inject(ReportesServicio);
  readonly #confirmaciones = inject(Confirmaciones);
  readonly #router = inject(Router);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly borrado = this.#fb.group({ contrasena: ['', Validators.required] });

  protected readonly descargar = accion(async () => {
    const datos = await this.#reportes.misDatos();
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }),
    );
    enlace.href = url;
    enlace.download = 'mis-datos-meritia.json';
    enlace.click();
    URL.revokeObjectURL(url);
    this.#avisos.exito('Descargaste una copia de tus datos.');
  });

  protected async pedirEliminar(): Promise<void> {
    if (this.borrado.invalid) return;
    const confirmado = await this.#confirmaciones.pedir({
      titulo: '¿Eliminar tu cuenta?',
      texto: 'Se borran tu nombre y tu correo y no podrás volver a entrar. No se deshace.',
      accion: 'Eliminar mi cuenta',
      peligrosa: true,
    });
    if (confirmado) void this.eliminar.correr();
  }

  protected readonly eliminar = accion(async () => {
    await this.sesion.eliminarCuenta(this.borrado.getRawValue().contrasena);
    this.#avisos.info('Tu cuenta fue eliminada.');
    await this.#router.navigateByUrl('/acceso');
  });

  protected readonly permisos = recurso(() => this.#servicio.mios());
  protected readonly copiado = signal(false);

  /**
   * Solo se ofrecen los permisos que el backend hace cumplir (`vigilado`).
   * Biometría y perfil público gobiernan funciones que no existen todavía; un
   * interruptor sin efecto prometería un control que nadie vigila.
   */
  protected readonly vigilados = (permisos: Permiso[]) => permisos.filter((p) => p.vigilado);

  protected async copiar(): Promise<void> {
    const id = this.sesion.usuario()?.id;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      this.#avisos.info('Tu navegador no dejó copiar. Selecciona el código y cópialo a mano.');
    }
  }

  protected alternar(permiso: Permiso, concedido: boolean): void {
    void this.cambiar.correr(permiso, concedido);
  }

  protected readonly cambiar = accion(async (permiso: Permiso, concedido: boolean) => {
    try {
      this.permisos.fijar(await this.#servicio.registrar([{ tipo: permiso.tipo, concedido }]));
      this.#avisos.exito(
        concedido
          ? 'Permiso concedido.'
          : 'Permiso retirado. Queda registrado con la fecha de hoy.',
      );
    } catch (causa) {
      await this.permisos.recargar(); // el interruptor vuelve a lo que de verdad hay guardado
      throw causa;
    }
  });
}

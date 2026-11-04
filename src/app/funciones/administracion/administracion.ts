import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Chip, EstadoRecurso, Panel } from '../../compartido/ui/basicos';
import { Campo } from '../../compartido/ui/campo';
import { EmpresasServicio } from '../../nucleo/api/empresas.servicio';
import { SECTORES, type Sector } from '../../nucleo/api/modelos';
import { EvaluacionesServicio } from '../../nucleo/api/evaluaciones.servicio';
import { accion, recurso } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';

/**
 * Consola del administrador: salud de la cola, empresas y altas de personal.
 *
 * La cola está arriba porque es lo único que puede estar mal ahora mismo; lo
 * demás es trabajo que se hace cuando se decide hacerlo.
 */
@Component({
  selector: 'app-administracion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, Chip, EstadoRecurso, Panel, Campo],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">plataforma</span>
      <h1>Administración</h1>
    </header>

    <!-- ----------------------------------------------------- Cola -->
    <ui-panel antetitulo="evaluación asíncrona" titulo="Cola de calificación">
      <div acciones class="fila">
        @if (cola.datos(); as m) {
          <ui-chip [tono]="m.workerActivo ? 'exito' : 'peligro'" [vivo]="m.workerActivo">
            {{ m.workerActivo ? 'Worker activo' : 'Worker detenido' }}
          </ui-chip>
        }
        <button type="button" class="btn btn--sm" (click)="cola.recargar()">Actualizar</button>
      </div>

      <ui-recurso
        [cargando]="cola.cargando() && !cola.datos()"
        [error]="cola.error()"
        [filas]="1"
        (reintentar)="cola.recargar()"
      />

      @if (cola.datos(); as m) {
        <dl class="metricas">
          <div>
            <dt class="micro">En espera</dt>
            <dd>{{ m.enEspera }}</dd>
          </div>
          <div>
            <dt class="micro">Activos</dt>
            <dd>{{ m.activos }}</dd>
          </div>
          <div>
            <dt class="micro">Reprogramados</dt>
            <dd>{{ m.reprogramados }}</dd>
          </div>
          <div class="mal">
            <dt class="micro">Fallidos</dt>
            <dd>{{ m.fallidos }}</dd>
          </div>
          <div>
            <dt class="micro">Completados</dt>
            <dd>{{ m.completados }}</dd>
          </div>
        </dl>

        <form class="reintento" [formGroup]="reintento" (ngSubmit)="reintentar.correr()">
          <ui-campo
            etiqueta="Reintentar la evaluación de una entrega"
            para="idEntrega"
            ayuda="No gasta un intento del candidato: la culpa fue del servicio, no de la entrega."
            [control]="reintento.controls.idEntrega"
          >
            <input
              id="idEntrega"
              type="text"
              class="control"
              formControlName="idEntrega"
              placeholder="UUID de la entrega fallida"
            />
          </ui-campo>
          <button
            type="submit"
            class="btn btn--sm"
            [disabled]="reintento.invalid || reintentar.enviando()"
          >
            {{ reintentar.enviando() ? 'Encolando…' : 'Reintentar' }}
          </button>
          @if (reintentar.error(); as error) {
            <p class="campo__error" role="alert">{{ error }}</p>
          }
        </form>
      }
    </ui-panel>

    <div class="columnas">
      <!-- ------------------------------------------------ Empresas -->
      <ui-panel antetitulo="clientes" titulo="Empresas">
        <ui-recurso
          [cargando]="empresas.cargando()"
          [error]="empresas.error()"
          [vacio]="(empresas.datos()?.length ?? 0) === 0 && !empresas.cargando()"
          tituloVacio="Sin empresas"
          textoVacio="Cada empresa cliente aísla por completo sus vacantes, ejercicios y resultados."
          (reintentar)="empresas.recargar()"
        />

        @if ((empresas.datos()?.length ?? 0) > 0) {
          <ul class="lista">
            @for (empresa of empresas.datos() ?? []; track empresa.id) {
              <li>
                <div>
                  <strong>{{ empresa.nombre }}</strong>
                  <p class="micro">
                    {{ empresa.sector }}{{ empresa.nit ? ' · NIT ' + empresa.nit : '' }} · desde
                    {{ empresa.creadaEn | date: 'd MMM y' }}
                  </p>
                </div>
                <ui-chip [tono]="empresa.activa ? 'exito' : 'peligro'">
                  {{ empresa.activa ? 'Activa' : 'Inactiva' }}
                </ui-chip>
              </li>
            }
          </ul>
        }

        <div class="separador"></div>

        <form class="pila pila--sm" [formGroup]="nuevaEmpresa" (ngSubmit)="crearEmpresa.correr()">
          <ui-campo
            etiqueta="Nueva empresa"
            para="nombreEmpresa"
            [control]="nuevaEmpresa.controls.nombre"
          >
            <input id="nombreEmpresa" type="text" class="control" formControlName="nombre" />
          </ui-campo>
          <ui-campo etiqueta="Sector" para="sectorEmpresa" [control]="nuevaEmpresa.controls.sector">
            <select id="sectorEmpresa" class="control" formControlName="sector">
              @for (sector of sectores; track sector) {
                <option [value]="sector">{{ sector }}</option>
              }
            </select>
          </ui-campo>
          <ui-campo
            etiqueta="NIT"
            para="nitEmpresa"
            opcional
            ayuda="Con dígito de verificación, p. ej. 890903938-8. Único entre empresas."
            [control]="nuevaEmpresa.controls.nit"
          >
            <input id="nitEmpresa" type="text" class="control" formControlName="nit" />
          </ui-campo>
          @if (crearEmpresa.error(); as error) {
            <p class="campo__error" role="alert">{{ error }}</p>
          }
          <button
            type="submit"
            class="btn btn--sm"
            [disabled]="nuevaEmpresa.invalid || crearEmpresa.enviando()"
          >
            {{ crearEmpresa.enviando() ? 'Creando…' : 'Crear empresa' }}
          </button>
        </form>
      </ui-panel>

      <!-- ------------------------------------------------- Usuarios -->
      <ui-panel antetitulo="acceso" titulo="Alta de personal">
        <form class="pila" [formGroup]="nuevoUsuario" (ngSubmit)="crearUsuario.correr()">
          <ui-campo etiqueta="Empresa" para="idEmpresa" [control]="nuevoUsuario.controls.idEmpresa">
            <select id="idEmpresa" class="control" formControlName="idEmpresa">
              <option value="">Selecciona una empresa…</option>
              @for (empresa of empresas.datos() ?? []; track empresa.id) {
                <option [value]="empresa.id">{{ empresa.nombre }}</option>
              }
            </select>
          </ui-campo>

          <ui-campo
            etiqueta="Nombre completo"
            para="nombreUsuario"
            [control]="nuevoUsuario.controls.nombreCompleto"
          >
            <input
              id="nombreUsuario"
              type="text"
              class="control"
              formControlName="nombreCompleto"
            />
          </ui-campo>

          <ui-campo etiqueta="Correo" para="correoUsuario" [control]="nuevoUsuario.controls.correo">
            <input id="correoUsuario" type="email" class="control" formControlName="correo" />
          </ui-campo>

          <ui-campo
            etiqueta="Contraseña inicial"
            para="contrasenaUsuario"
            ayuda="Mínimo 12 caracteres. La persona debería cambiarla al entrar."
            [control]="nuevoUsuario.controls.contrasena"
          >
            <input
              id="contrasenaUsuario"
              type="password"
              class="control"
              formControlName="contrasena"
              autocomplete="new-password"
            />
          </ui-campo>

          <ui-campo etiqueta="Rol" para="rolUsuario" [control]="nuevoUsuario.controls.rol">
            <select id="rolUsuario" class="control" formControlName="rol">
              <option value="reclutador">Reclutador</option>
              <option value="administrador">Administrador</option>
            </select>
          </ui-campo>

          @if (crearUsuario.error(); as error) {
            <p class="campo__error" role="alert">{{ error }}</p>
          }
          <button
            type="submit"
            class="btn btn--primario"
            [disabled]="nuevoUsuario.invalid || crearUsuario.enviando()"
          >
            {{ crearUsuario.enviando() ? 'Creando…' : 'Crear cuenta' }}
          </button>
        </form>
      </ui-panel>
    </div>
  `,
  styles: `
    .cabecera {
      margin-bottom: var(--e-5);
    }
    h1 {
      font-size: var(--t-1);
    }
    .metricas {
      display: grid;
      gap: var(--e-3);
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      margin: 0 0 var(--e-4);
    }
    .metricas dd {
      margin: 0;
      font-family: var(--fuente-display);
      font-size: var(--t-2);
      font-weight: var(--peso-display);
      line-height: 1;
    }
    .metricas .mal dd {
      color: var(--c-peligro);
    }
    .reintento {
      display: grid;
      gap: var(--e-3);
      justify-items: start;
      max-width: 520px;
      padding-top: var(--e-4);
      border-top: 1px solid var(--c-borde);
    }
    .reintento ui-campo {
      width: 100%;
    }
    .lista {
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
    }
    .lista li {
      display: flex;
      gap: var(--e-3);
      align-items: center;
      justify-content: space-between;
      padding-bottom: var(--e-2);
      border-bottom: 1px solid var(--c-borde);
    }
    .separador {
      margin: var(--e-4) 0;
      height: 1px;
      background: var(--c-borde);
    }
  `,
})
export class Administracion {
  readonly #empresas = inject(EmpresasServicio);
  readonly #evaluaciones = inject(EvaluacionesServicio);
  readonly #avisos = inject(Avisos);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly empresas = recurso(() => this.#empresas.listar());
  protected readonly cola = recurso(() => this.#evaluaciones.cola());

  protected readonly nuevaEmpresa = this.#fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    sector: ['tecnologia' as Sector, [Validators.required]],
    nit: [''],
  });
  protected readonly sectores = SECTORES;

  protected readonly nuevoUsuario = this.#fb.group({
    idEmpresa: ['', [Validators.required]],
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(12)]],
    rol: ['reclutador' as 'reclutador' | 'administrador', [Validators.required]],
  });

  protected readonly reintento = this.#fb.group({
    idEntrega: ['', [Validators.required, Validators.pattern(/^[0-9a-f-]{36}$/i)]],
  });

  constructor() {
    // La cola es estado vivo: mirarla una vez no dice nada.
    const reloj = setInterval(() => void this.cola.recargar(), 15000);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected readonly crearEmpresa = accion(async () => {
    const { nit, ...resto } = this.nuevaEmpresa.getRawValue();
    await this.#empresas.crear({ ...resto, ...(nit.trim() ? { nit: nit.trim() } : {}) });
    this.nuevaEmpresa.reset({ sector: resto.sector });
    await this.empresas.recargar();
    this.#avisos.exito('Empresa creada.');
  });

  protected readonly crearUsuario = accion(async () => {
    const { idEmpresa, ...datos } = this.nuevoUsuario.getRawValue();
    const usuario = await this.#empresas.crearUsuario(idEmpresa, datos);
    this.nuevoUsuario.reset({ rol: 'reclutador', idEmpresa });
    this.#avisos.exito(`Cuenta creada para ${usuario.correo}.`);
  });

  protected readonly reintentar = accion(async () => {
    await this.#evaluaciones.reintentar(this.reintento.getRawValue().idEntrega);
    this.reintento.reset();
    await this.cola.recargar();
    this.#avisos.exito('Evaluación encolada de nuevo.');
  });
}

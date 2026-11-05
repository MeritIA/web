import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROL } from '../compartido/dominio';
import { Plataforma } from '../nucleo/plataforma/plataforma';
import { Sesion } from '../nucleo/sesion/sesion';
import { TemaServicio } from '../nucleo/ui/tema';

interface Enlace {
  ruta: string;
  texto: string;
}

/**
 * El marco de la aplicación: lo que no cambia al navegar.
 *
 * La navegación se arma desde el rol, no desde la ruta actual, así que un
 * candidato nunca llega a ver la existencia de «Ejercicios» ni tiene que
 * descubrir a base de 403 qué puede hacer.
 */
@Component({
  selector: 'app-marco',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="saltar" href="#principal">Saltar al contenido</a>

    <header class="cinta">
      <div class="cinta__pastilla">
        <a class="marca" [routerLink]="inicio()" aria-label="MeritIA, inicio">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 1.5 20.5 12 12 22.5 3.5 12Z" fill="none" stroke="currentColor" />
            <path d="M12 6.5 16.8 12 12 17.5 7.2 12Z" fill="currentColor" opacity=".55" />
          </svg>
          <span class="marca__texto">
            <span class="marca__nombre"><strong>MERIT</strong><em>IA</em></span>
            <small class="micro">evaluación con evidencia</small>
          </span>
        </a>

        <nav class="nav" [class.nav--oculta]="tecladoAbierto()" aria-label="Secciones">
          @for (enlace of enlaces(); track enlace.ruta) {
            <a
              class="nav__enlace"
              [routerLink]="enlace.ruta"
              routerLinkActive="nav__enlace--activo"
              [routerLinkActiveOptions]="{ exact: false }"
              >{{ enlace.texto }}</a
            >
          }
        </nav>

        <div class="fila">
          <button
            type="button"
            class="btn btn--sm btn--fantasma"
            (click)="tema.alternar()"
            [attr.aria-label]="
              tema.actual() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
            "
          >
            {{ tema.actual() === 'oscuro' ? '◐' : '◑' }}
          </button>

          @if (sesion.usuario(); as usuario) {
            <div class="usuario">
              <span class="micro">{{ rol() }}</span>
              <button type="button" class="btn btn--sm" (click)="salir()">Salir</button>
            </div>
          }
        </div>
      </div>
    </header>

    <main id="principal" class="contenido malla" tabindex="-1">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }

    .cinta {
      position: sticky;
      top: 0;
      z-index: var(--z-barra);
      padding: var(--e-3) var(--e-4);
      backdrop-filter: blur(14px);
    }

    .cinta__pastilla {
      display: flex;
      gap: var(--e-4);
      align-items: center;
      justify-content: space-between;
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: var(--e-2) var(--e-2) var(--e-2) var(--e-4);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-pill);
      background: color-mix(in srgb, var(--c-superficie) 82%, transparent);
    }

    .marca {
      display: flex;
      gap: var(--e-3);
      align-items: center;
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
    .marca strong {
      font-weight: var(--peso-fuerte);
      letter-spacing: 0.22em;
      font-size: var(--t-menor);
    }
    .marca em {
      font-style: normal;
      color: var(--c-acento);
      font-weight: var(--peso-fuerte);
      letter-spacing: 0.22em;
      font-size: var(--t-menor);
    }
    .marca small {
      font-size: 0.6rem;
    }

    .nav {
      display: flex;
      gap: var(--e-1);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .nav__enlace {
      padding: var(--e-2) var(--e-3);
      border-radius: var(--r-pill);
      color: var(--c-texto-suave);
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      letter-spacing: var(--tracking-micro);
      text-transform: uppercase;
      text-decoration: none;
      white-space: nowrap;
      transition:
        color var(--mov) var(--curva),
        background var(--mov) var(--curva);
    }
    .nav__enlace:hover {
      color: var(--c-texto);
      background: var(--c-neutro-tenue);
    }
    .nav__enlace--activo {
      color: var(--c-texto);
      background: var(--c-neutro-tenue);
      box-shadow: inset 0 0 0 1px var(--c-borde);
    }

    .usuario {
      display: flex;
      gap: var(--e-3);
      align-items: center;
    }

    .contenido {
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: var(--e-6) var(--e-4) var(--e-8);
    }
    .contenido:focus {
      outline: none;
    }

    /* Móvil: cabecera de una fila y navegación como barra inferior, al alcance del pulgar. */
    @media (max-width: 860px) {
      .cinta {
        /* Un filtro en el ancestro haría que la barra fija se midiera contra la cabecera. */
        backdrop-filter: none;
        padding-top: max(var(--e-2), env(safe-area-inset-top));
        padding-right: max(var(--e-3), env(safe-area-inset-right));
        padding-left: max(var(--e-3), env(safe-area-inset-left));
      }
      .cinta__pastilla {
        padding: var(--e-2) var(--e-2) var(--e-2) var(--e-4);
      }
      .marca small,
      .usuario .micro {
        display: none;
      }
      .nav {
        position: fixed;
        inset: auto 0 0;
        z-index: var(--z-barra);
        gap: 0;
        padding: var(--e-1) max(var(--e-2), env(safe-area-inset-right))
          calc(var(--e-1) + env(safe-area-inset-bottom)) max(var(--e-2), env(safe-area-inset-left));
        border-top: 1px solid var(--c-borde);
        background: color-mix(in srgb, var(--c-superficie) 94%, transparent);
        backdrop-filter: blur(14px);
        scroll-snap-type: x proximity;
      }
      .nav--oculta {
        display: none;
      }
      .nav__enlace {
        display: flex;
        flex: 1 0 auto;
        align-items: center;
        justify-content: center;
        min-width: 88px;
        min-height: 48px;
        scroll-snap-align: start;
      }
      .contenido {
        padding-bottom: calc(var(--e-8) + 48px + env(safe-area-inset-bottom));
        padding-right: max(var(--e-4), env(safe-area-inset-right));
        padding-left: max(var(--e-4), env(safe-area-inset-left));
      }
    }
  `,
})
export class Marco {
  protected readonly sesion = inject(Sesion);
  protected readonly tema = inject(TemaServicio);
  readonly #plataforma = inject(Plataforma);
  protected readonly tecladoAbierto = computed(() => this.#plataforma.tecladoAlto() > 0);
  readonly #router = inject(Router);

  protected readonly rol = computed(() => {
    const rol = this.sesion.rol();
    return rol ? ROL[rol] : '';
  });

  protected readonly inicio = computed(() =>
    this.sesion.esCandidato()
      ? '/mis-pruebas'
      : this.sesion.esModerador()
        ? '/moderacion'
        : '/panel',
  );

  protected readonly enlaces = computed<Enlace[]>(() => {
    if (this.sesion.esCandidato()) {
      return [
        { ruta: '/explorar', texto: 'Explorar' },
        { ruta: '/mis-pruebas', texto: 'Mis pruebas' },
        { ruta: '/mis-resultados', texto: 'Mis resultados' },
        { ruta: '/mentor', texto: 'Mentor' },
        { ruta: '/mis-pagos', texto: 'Pagos' },
        { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
      ];
    }
    if (this.sesion.esModerador()) {
      return [
        { ruta: '/moderacion', texto: 'Casos' },
        { ruta: '/moderacion/metricas', texto: 'Métricas' },
      ];
    }
    const base: Enlace[] = [
      { ruta: '/panel', texto: 'Panel' },
      { ruta: '/vacantes', texto: 'Vacantes' },
      { ruta: '/ejercicios', texto: 'Ejercicios' },
      { ruta: '/talento', texto: 'Talento' },
    ];
    return this.sesion.esAdministrador()
      ? [
          ...base,
          { ruta: '/moderacion/metricas', texto: 'Moderación' },
          { ruta: '/administracion', texto: 'Administración' },
        ]
      : base;
  });

  protected async salir(): Promise<void> {
    await this.sesion.salir();
    await this.#router.navigate(['/acceso']);
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { irAAncla } from '../../compartido/ui/ancla';
import { Aparecer } from '../../compartido/ui/aparecer';
import { OrbeFluido } from '../../compartido/ui/orbe-fluido';
import { Sesion, inicioDe } from '../../nucleo/sesion/sesion';
import { TemaServicio } from '../../nucleo/ui/tema';
import { ButtonDirective } from 'primeng/button';
import { SeccionesInicio } from './secciones-inicio';

interface Enlace {
  texto: string;
  ancla: string;
}

interface FilaRanking {
  puesto: string;
  nombre: string;
  nota: number;
}

/**
 * La puerta pública de MeritIA.
 *
 * Antes, la raíz mandaba directo al formulario de acceso: quien no conocía el
 * producto tenía que crear una cuenta para averiguar qué era. Esta portada
 * explica la propuesta en orden —qué problema resuelve, cómo se ve la
 * evidencia, qué gana cada rol— y deja las cuentas a un clic, sin esconderlas
 * en un menú.
 *
 * El cuerpo largo vive en `SeccionesInicio`; aquí quedan la barra, la promesa
 * inicial y el pie, que son lo que se ve antes y después de leer.
 */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Aparecer, ButtonDirective, OrbeFluido, RouterLink, SeccionesInicio],
  template: `
    <div class="progreso" aria-hidden="true"></div>
    <a class="saltar" href="#contenido">Saltar al contenido</a>

    <header id="arriba" class="cinta">
      <div class="cinta__interior">
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

        <nav
          id="menu-principal"
          class="menu"
          [class.menu--abierto]="menuAbierto()"
          aria-label="Secciones de la página"
        >
          @for (enlace of navegacion; track enlace.ancla) {
            <a [href]="enlace.ancla" (click)="irA($event, enlace.ancla); menuAbierto.set(false)">{{
              enlace.texto
            }}</a>
          }
          <div class="menu__cuenta">
            @if (sesion.autenticado()) {
              <a class="btn btn--primario btn--bloque" [routerLink]="panel()">Ir a mi panel</a>
            } @else {
              <a class="btn btn--bloque" routerLink="/acceso">Entrar</a>
              <a class="btn btn--primario btn--bloque" routerLink="/registro">Crear cuenta</a>
            }
          </div>
        </nav>

        <div class="acciones">
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

          @if (sesion.autenticado()) {
            <a class="entrar" [routerLink]="panel()">Mi panel</a>
          } @else {
            <a class="entrar" routerLink="/acceso">Entrar</a>
            <a class="crear" routerLink="/registro" pButton>Crear cuenta</a>
          }

          <button
            type="button"
            class="menu__boton"
            [attr.aria-expanded]="menuAbierto()"
            aria-controls="menu-principal"
            [attr.aria-label]="menuAbierto() ? 'Cerrar menú' : 'Abrir menú'"
            (click)="menuAbierto.set(!menuAbierto())"
          >
            <i
              class="pi"
              [class.pi-bars]="!menuAbierto()"
              [class.pi-times]="menuAbierto()"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>
    </header>

    <main id="contenido" tabindex="-1">
      <section class="hero malla">
        <div class="hero__texto">
          <p class="micro micro--acento" [appAparecer]="0">evaluación técnica con evidencia</p>
          <h1 class="titular-vivo" [appAparecer]="1">
            Evidencia verificable.<br />
            Decisión defendible.
          </h1>
          <p class="hero__bajada lectura" [appAparecer]="2">
            Cada candidato resuelve el mismo ejercicio y se califica contra la misma rúbrica. La
            nota llega con el desglose por criterio y la cita exacta que la justifica.
          </p>

          <div class="hero__cta" [appAparecer]="3">
            <a routerLink="/registro" pButton>Quiero resolver pruebas</a>
            <a class="btn" routerLink="/registro-empresa">Quiero evaluar talento</a>
          </div>
          <p class="hero__nota" [appAparecer]="4">
            ¿Ya tienes cuenta? <a routerLink="/acceso">Entra aquí</a>. Sin tarjeta para empezar.
          </p>

          <dl class="hero__datos" [appAparecer]="5">
            <div>
              <dt class="micro">Escala</dt>
              <dd>/100</dd>
            </div>
            <div>
              <dt class="micro">Por criterio</dt>
              <dd>Cita textual</dd>
            </div>
            <div>
              <dt class="micro">Por vacante</dt>
              <dd>Un ranking</dd>
            </div>
          </dl>
        </div>

        <div class="hero__visual" [appAparecer]="2">
          <ui-orbe-fluido class="orbe" tamano="clamp(220px, 28vw, 340px)" />

          <article class="ranking panel" aria-label="Ejemplo de ranking de una vacante">
            <header class="ranking__cab">
              <div class="pila pila--sm">
                <p class="micro">ranking · backend senior</p>
                <h2>Finalistas</h2>
              </div>
              <span class="chip chip--limpio">datos de ejemplo</span>
            </header>

            <ol>
              @for (fila of ranking; track fila.nombre) {
                <li>
                  <div class="ranking__fila">
                    <span class="puesto">{{ fila.puesto }}</span>
                    <span class="nombre">{{ fila.nombre }}</span>
                    <span class="nota">{{ fila.nota }}</span>
                  </div>
                  <div
                    class="barra"
                    role="meter"
                    [attr.aria-valuenow]="fila.nota"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [attr.aria-label]="'Nota de ' + fila.nombre"
                  >
                    <div class="barra__relleno" [style.width.%]="fila.nota"></div>
                  </div>
                </li>
              }
            </ol>

            <p class="ranking__pie micro">
              El mejor intento de cada persona ·
              <a href="#evidencia" (click)="irA($event, '#evidencia')">ver el desglose</a>
            </p>
          </article>
        </div>
      </section>

      <app-secciones-inicio />
    </main>

    <footer class="pie">
      <div class="pie__interior">
        <div class="pie__marca">
          <a class="marca" routerLink="/">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 1.5 20.5 12 12 22.5 3.5 12Z" fill="none" stroke="currentColor" />
              <path d="M12 6.5 16.8 12 12 17.5 7.2 12Z" fill="currentColor" opacity=".55" />
            </svg>
            <span class="marca__nombre"><strong>MERIT</strong><em>IA</em></span>
          </a>
          <p>
            Evaluación técnica con evidencia, para candidatos y empresas que quieren decisiones
            explicables.
          </p>
          <p class="micro">datos tratados conforme a la Ley 1581 de 2012</p>
        </div>

        <nav aria-label="Producto">
          <p class="micro">producto</p>
          <a href="#como-funciona" (click)="irA($event, '#como-funciona')">Cómo funciona</a>
          <a href="#evidencia" (click)="irA($event, '#evidencia')">La evidencia</a>
          <a href="#roles" (click)="irA($event, '#roles')">Para quién</a>
          <a href="#preguntas" (click)="irA($event, '#preguntas')">Preguntas</a>
        </nav>

        <nav aria-label="Cuenta">
          <p class="micro">cuenta</p>
          <a routerLink="/acceso">Entrar</a>
          <a routerLink="/registro">Crear cuenta</a>
          <a routerLink="/registro-empresa">Registrar empresa</a>
          <a href="#arriba" (click)="irA($event, '#arriba')">Volver arriba</a>
        </nav>
      </div>

      <div class="pie__legal">
        <span>© {{ anio }} MeritIA</span>
        <span>Hecho para decidir mejor, no para decidir por ti.</span>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      overflow-x: clip;
    }

    /* Progreso de lectura: CSS puro, sin un listener de scroll. Donde el
       navegador no lo soporta, simplemente no existe. */
    .progreso {
      position: fixed;
      inset: 0 0 auto;
      z-index: var(--z-aviso);
      height: 2px;
      background: var(--c-acento);
      transform-origin: 0 50%;
      pointer-events: none;
    }
    @supports (animation-timeline: scroll()) {
      .progreso {
        animation: avance linear both;
        animation-timeline: scroll(root);
      }
    }
    @keyframes avance {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .progreso {
        display: none;
      }
    }

    :where(section[id], footer[id]) {
      scroll-margin-top: calc(var(--alto-barra) + var(--e-6));
    }

    /* --- Barra superior ------------------------------------------------ */
    .cinta {
      position: sticky;
      top: 0;
      z-index: var(--z-barra);
      padding: var(--e-3) var(--e-4);
      backdrop-filter: blur(14px);
    }
    .cinta__interior {
      position: relative;
      display: flex;
      gap: var(--e-4);
      align-items: center;
      justify-content: space-between;
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: var(--e-2) var(--e-2) var(--e-2) var(--e-4);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-pill);
      background: color-mix(in srgb, var(--c-superficie) 84%, transparent);
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
    /* La regla global de objetivos táctiles da 24 px a los enlaces dentro de un
       div; la marca es la vuelta al inicio y necesita los 44 del pulgar. */
    .cinta__interior > .marca {
      min-height: 44px;
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

    .menu {
      display: flex;
      gap: var(--e-1);
      align-items: center;
    }
    .menu > a {
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
    .menu > a:hover {
      color: var(--c-texto);
      background: var(--c-neutro-tenue);
    }
    .menu__cuenta {
      display: none;
    }

    .acciones {
      display: flex;
      gap: var(--e-2);
      align-items: center;
    }
    .entrar {
      padding: var(--e-2) var(--e-3);
      border-radius: var(--r-pill);
      color: var(--c-texto-suave);
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      letter-spacing: var(--tracking-micro);
      text-transform: uppercase;
      text-decoration: none;
      white-space: nowrap;
    }
    .entrar:hover {
      color: var(--c-texto);
      background: var(--c-neutro-tenue);
    }
    .menu__boton {
      display: none;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--c-borde);
      border-radius: 50%;
      background: transparent;
      color: var(--c-texto);
    }
    .menu__boton:hover {
      background: var(--c-neutro-tenue);
    }

    /* --- Hero ---------------------------------------------------------- */
    main:focus {
      outline: none;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
      gap: var(--e-7);
      align-items: center;
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: clamp(var(--e-6), 7vw, var(--e-8)) var(--e-4) var(--e-8);
    }
    .hero__texto {
      display: grid;
      gap: var(--e-4);
      align-content: center;
    }
    .hero h1 {
      font-size: clamp(2.6rem, 1.3rem + 4.2vw, 4.25rem);
    }
    .hero__bajada {
      max-width: 54ch;
      color: var(--c-texto-suave);
      font-size: var(--t-4);
    }
    .hero__cta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      align-items: center;
      margin-top: var(--e-2);
    }
    .hero__nota {
      color: var(--c-texto-tenue);
      font-size: var(--t-menor);
    }
    .hero__nota a {
      color: var(--c-texto-suave);
    }
    .hero__datos {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--e-3);
      margin: var(--e-2) 0 0;
      padding-top: var(--e-4);
      border-top: 1px solid var(--c-borde);
    }
    .hero__datos div {
      display: grid;
      gap: 2px;
    }
    .hero__datos dd {
      margin: 0;
      font-family: var(--fuente-display);
      font-size: var(--t-3);
      font-weight: var(--peso-display);
      letter-spacing: var(--tracking-display);
    }

    .hero__visual {
      position: relative;
      display: grid;
      place-items: center;
      min-width: 0;
    }
    .orbe {
      position: absolute;
      z-index: -1;
      opacity: 0.85;
    }
    .ranking {
      display: grid;
      gap: var(--e-4);
      width: min(430px, 100%);
      padding: var(--e-4);
      background: color-mix(in srgb, var(--c-superficie) 93%, transparent);
      backdrop-filter: blur(8px);
      box-shadow: var(--c-sombra);
    }
    .ranking__cab {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      align-items: start;
      justify-content: space-between;
    }
    .ranking h2 {
      font-size: var(--t-3);
    }
    .ranking ol {
      display: grid;
      gap: var(--e-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ranking li {
      display: grid;
      gap: var(--e-2);
      padding: var(--e-3);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
      background: var(--c-superficie-alta);
    }
    .ranking__fila {
      display: grid;
      grid-template-columns: 1.8rem minmax(0, 1fr) auto;
      gap: var(--e-2);
      align-items: baseline;
    }
    .puesto,
    .nota {
      font-family: var(--fuente-mono);
      font-variant-numeric: tabular-nums;
    }
    .puesto {
      font-size: var(--t-micro);
      color: var(--c-texto-tenue);
    }
    .nombre {
      overflow: hidden;
      font-size: var(--t-menor);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nota {
      color: var(--c-acento);
      font-size: var(--t-3);
    }
    .ranking__pie {
      font-family: var(--fuente-texto);
      font-size: 0.7rem;
      letter-spacing: 0;
      line-height: 1.45;
      text-transform: none;
    }
    .ranking__pie a {
      color: var(--c-texto-suave);
    }

    /* --- Pie ----------------------------------------------------------- */
    .pie {
      border-top: 1px solid var(--c-borde);
      background: color-mix(in srgb, var(--c-superficie) 58%, transparent);
    }
    .pie__interior {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: var(--e-5);
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: var(--e-6) var(--e-4);
    }
    .pie__marca {
      display: grid;
      gap: var(--e-3);
      align-content: start;
    }
    .pie__marca .marca {
      min-height: 0;
    }
    .pie__marca > p {
      max-width: 40ch;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .pie nav {
      display: grid;
      gap: var(--e-2);
      align-content: start;
    }
    .pie nav a {
      width: fit-content;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
      text-decoration: none;
    }
    .pie nav a:hover {
      color: var(--c-texto);
      text-decoration: underline;
    }
    .pie__legal {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      justify-content: space-between;
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: 0 var(--e-4) var(--e-5);
      color: var(--c-texto-tenue);
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    /* --- Adaptación ---------------------------------------------------- */
    @media (max-width: 1000px) {
      .hero {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--e-6);
      }
      .hero__texto {
        max-width: 720px;
      }
      .hero__visual {
        justify-items: center;
      }
    }

    @media (min-width: 1001px) and (max-width: 1120px) {
      .cinta__interior {
        gap: var(--e-2);
      }
      .menu {
        gap: 0;
      }
      .menu > a {
        padding-inline: var(--e-2);
      }
    }

    @media (max-width: 1000px) {
      .menu {
        position: absolute;
        top: calc(100% + var(--e-2));
        right: 0;
        left: 0;
        display: none;
        padding: var(--e-3);
        border: 1px solid var(--c-borde);
        border-radius: var(--r-lg);
        background: var(--c-superficie);
        box-shadow: var(--c-sombra);
      }
      .menu--abierto {
        display: grid;
        gap: var(--e-1);
      }
      .menu > a {
        padding: var(--e-3);
        border-radius: var(--r-md);
        font-size: var(--t-menor);
      }
      .menu__cuenta {
        display: grid;
        gap: var(--e-2);
        margin-top: var(--e-2);
        padding-top: var(--e-3);
        border-top: 1px solid var(--c-borde);
      }
      .acciones .entrar,
      .acciones .crear {
        display: none;
      }
      .menu__boton {
        display: grid;
      }
    }

    @media (max-width: 680px) {
      .cinta {
        padding-top: max(var(--e-2), env(safe-area-inset-top));
      }
      .marca small {
        display: none;
      }
      .hero {
        padding-top: var(--e-6);
        padding-bottom: var(--e-6);
      }
      .hero__cta > * {
        flex: 1 1 100%;
      }
      .hero__datos {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--e-2);
      }
      .hero__datos div {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding-bottom: var(--e-2);
        border-bottom: 1px solid var(--c-borde);
      }
      .hero__datos div:last-child {
        padding-bottom: 0;
        border-bottom: 0;
      }
      .hero__visual {
        justify-items: center;
      }
      .ranking {
        padding: var(--e-3);
      }
      .pie__interior {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 420px) {
      .ranking__fila {
        grid-template-columns: 1.4rem minmax(0, 1fr) auto;
      }
    }
  `,
})
export class Inicio {
  protected readonly sesion = inject(Sesion);
  protected readonly tema = inject(TemaServicio);
  protected readonly menuAbierto = signal(false);
  protected readonly anio = new Date().getFullYear();
  protected readonly panel = computed(() => inicioDe(this.sesion.rol() ?? 'candidato'));
  protected readonly irA = irAAncla;

  protected readonly navegacion: readonly Enlace[] = [
    { texto: 'Cómo funciona', ancla: '#como-funciona' },
    { texto: 'La evidencia', ancla: '#evidencia' },
    { texto: 'Para quién', ancla: '#roles' },
    { texto: 'Preguntas', ancla: '#preguntas' },
  ];

  protected readonly ranking: readonly FilaRanking[] = [
    { puesto: '01', nombre: 'Valentina R.', nota: 92.5 },
    { puesto: '02', nombre: 'Andrés M.', nota: 88 },
    { puesto: '03', nombre: 'Camila T.', nota: 81.5 },
  ];
}

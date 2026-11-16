import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { irAAncla } from '../../compartido/ui/ancla';
import { Aparecer } from '../../compartido/ui/aparecer';
import { ButtonDirective } from 'primeng/button';
import { DemoEvidencia } from './demo-evidencia';

interface Paso {
  numero: string;
  titulo: string;
  texto: string;
}

interface Rasgo {
  icono: string;
  titulo: string;
  texto: string;
}

interface Pregunta {
  pregunta: string;
  respuesta: string;
}

/**
 * El cuerpo de la portada: cómo funciona, la evidencia, los dos roles, los
 * rasgos del producto y las dudas. Se separa de `Inicio` para que la barra y
 * el hero no carguen con el doble de CSS y para poder reordenar la narrativa
 * sin tocar la cabecera.
 */
@Component({
  selector: 'app-secciones-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Aparecer, ButtonDirective, DemoEvidencia, RouterLink],
  template: `
    <section id="como-funciona" class="seccion" aria-labelledby="titulo-como">
      <div class="seccion__cab">
        <div class="pila pila--sm">
          <p class="micro">cómo funciona</p>
          <h2 id="titulo-como">Tres pasos, la misma vara para todos.</h2>
        </div>
        <p>
          La evaluación no empieza cuando alguien lee un currículum: empieza cuando la empresa
          escribe qué considera un buen trabajo. Esa rúbrica se aplica igual a cada entrega.
        </p>
      </div>

      <ol class="pasos">
        @for (paso of pasos; track paso.numero; let i = $index) {
          <li class="panel" [appAparecer]="i">
            <span class="numero">{{ paso.numero }}</span>
            <h3>{{ paso.titulo }}</h3>
            <p>{{ paso.texto }}</p>
          </li>
        }
      </ol>
    </section>

    <section id="evidencia" class="seccion" aria-labelledby="titulo-evidencia">
      <div class="evidencia">
        <div class="evidencia__texto">
          <p class="micro">la evidencia</p>
          <h2 id="titulo-evidencia">Una nota que se puede leer, discutir y defender.</h2>
          <p>
            El puntaje no es una caja negra. Cada criterio tiene peso, escala y una cita de la
            entrega que explica por qué obtuvo lo que obtuvo. Si una decisión se cuestiona, la
            respuesta ya está escrita.
          </p>
          <ul class="lista-chequeo">
            @for (punto of garantias; track punto) {
              <li>
                <i class="pi pi-check" aria-hidden="true"></i><span>{{ punto }}</span>
              </li>
            }
          </ul>
          <a class="btn" href="#preguntas" (click)="irA($event, '#preguntas')"
            >Resolver dudas frecuentes</a
          >
        </div>

        <div class="evidencia__demo" [appAparecer]="1">
          <app-demo-evidencia />
        </div>
      </div>
    </section>

    <section id="roles" class="seccion" aria-labelledby="titulo-roles">
      <div class="seccion__cab">
        <div class="pila pila--sm">
          <p class="micro">para quién</p>
          <h2 id="titulo-roles">Dos lados, la misma transparencia.</h2>
        </div>
        <p>
          Quien busca empleo quiere saber por qué no pasó. Quien contrata quiere saber por qué sí.
          MeritIA responde a los dos con el mismo desglose.
        </p>
      </div>

      <div class="roles">
        <article class="rol panel" [appAparecer]="0">
          <div class="pila pila--sm">
            <p class="micro micro--acento">candidato</p>
            <h3>Demuestra lo que sabes hacer.</h3>
            <p class="rol__bajada">
              Un reto práctico dice más que una lista de tecnologías. Y una nota con evidencia te
              dice dónde mejorar, no solo si gustaste.
            </p>
          </div>
          <ul>
            @for (punto of beneficiosCandidato; track punto) {
              <li>
                <i class="pi pi-angle-right" aria-hidden="true"></i><span>{{ punto }}</span>
              </li>
            }
          </ul>
          <a class="btn btn--primario" routerLink="/registro">Crear cuenta de candidato</a>
        </article>

        <article class="rol rol--empresa panel" [appAparecer]="1">
          <div class="pila pila--sm">
            <p class="micro micro--acento">empresa</p>
            <h3>Decide con un ranking que puedes defender.</h3>
            <p class="rol__bajada">
              Publica la vacante, define la rúbrica y recibe entregas comparables. La identidad
              aparece cuando la decisión la necesita, no antes.
            </p>
          </div>
          <ul>
            @for (punto of beneficiosEmpresa; track punto) {
              <li>
                <i class="pi pi-angle-right" aria-hidden="true"></i><span>{{ punto }}</span>
              </li>
            }
          </ul>
          <a class="btn btn--primario" routerLink="/registro-empresa">Registrar mi empresa</a>
        </article>
      </div>
    </section>

    <section class="seccion" aria-labelledby="titulo-rasgos">
      <div class="seccion__cab">
        <div class="pila pila--sm">
          <p class="micro">lo que sostiene la decisión</p>
          <h2 id="titulo-rasgos">Diseñado para que nada quede en el aire.</h2>
        </div>
        <p>
          La evaluación es la parte visible. Debajo hay versiones, permisos, señales de riesgo y un
          registro que permiten repetir la decisión meses después sin adivinar.
        </p>
      </div>

      <div class="rasgos">
        @for (rasgo of rasgos; track rasgo.titulo; let i = $index) {
          <article class="rasgo panel" [appAparecer]="i">
            <i [class]="'pi ' + rasgo.icono" aria-hidden="true"></i>
            <h3>{{ rasgo.titulo }}</h3>
            <p>{{ rasgo.texto }}</p>
          </article>
        }
      </div>
    </section>

    <section id="preguntas" class="seccion" aria-labelledby="titulo-preguntas">
      <div class="seccion__cab">
        <div class="pila pila--sm">
          <p class="micro">preguntas frecuentes</p>
          <h2 id="titulo-preguntas">Lo que conviene saber antes de entrar.</h2>
        </div>
        <p>
          Si algo no está aquí, la cuenta se crea sin costo y las respuestas quedan a la vista
          dentro del producto.
        </p>
      </div>

      <div class="preguntas">
        @for (pregunta of preguntas; track pregunta.pregunta) {
          <details class="pregunta">
            <summary>
              <span>{{ pregunta.pregunta }}</span>
              <i class="pi pi-plus" aria-hidden="true"></i>
            </summary>
            <p>{{ pregunta.respuesta }}</p>
          </details>
        }
      </div>
    </section>

    <section class="seccion" aria-labelledby="titulo-cierre">
      <div class="cierre panel" [appAparecer]="0">
        <p class="micro micro--acento">empieza por una prueba real</p>
        <h2 id="titulo-cierre">Menos intuición. Más evidencia.</h2>
        <p>
          Candidatos y empresas entran por la misma puerta: un ejercicio, una rúbrica y un resultado
          que se puede explicar.
        </p>
        <div class="cierre__cta">
          <a routerLink="/registro" pButton>Crear cuenta</a>
          <a class="btn" routerLink="/registro-empresa">Registrar empresa</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .seccion {
      max-width: var(--ancho-contenido);
      margin: 0 auto;
      padding: var(--e-7) var(--e-4);
      scroll-margin-top: calc(var(--alto-barra) + var(--e-6));
    }
    .seccion__cab {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: var(--e-5);
      align-items: end;
      margin-bottom: var(--e-6);
    }
    .seccion__cab h2 {
      font-size: var(--t-2);
    }
    .seccion__cab > p {
      max-width: 58ch;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }

    .pasos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
      gap: var(--e-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pasos li {
      display: grid;
      gap: var(--e-3);
      align-content: start;
      padding: var(--e-5);
    }
    .pasos .numero {
      font-family: var(--fuente-display);
      font-size: var(--t-2);
      font-weight: var(--peso-display);
      color: var(--c-acento);
      line-height: 1;
    }
    .pasos h3 {
      font-size: var(--t-3);
    }
    .pasos p {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }

    .evidencia {
      display: grid;
      grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
      gap: var(--e-7);
      align-items: center;
    }
    .evidencia__texto {
      display: grid;
      gap: var(--e-4);
      justify-items: start;
    }
    .evidencia__texto h2 {
      font-size: var(--t-2);
    }
    .evidencia__texto > p:not(.micro) {
      max-width: 52ch;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .lista-chequeo {
      display: grid;
      gap: var(--e-3);
      width: 100%;
      margin: var(--e-2) 0;
      padding: 0;
      list-style: none;
    }
    .lista-chequeo li {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--e-3);
      align-items: start;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .lista-chequeo i {
      margin-top: 3px;
      color: var(--c-acento);
      font-size: var(--t-micro);
    }
    .evidencia__demo {
      min-width: 0;
    }

    .roles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
      gap: var(--e-4);
    }
    .rol {
      display: grid;
      gap: var(--e-4);
      align-content: start;
      padding: var(--e-5);
    }
    .rol--empresa {
      border-color: color-mix(in srgb, var(--c-info) 32%, var(--c-borde));
    }
    .rol h3 {
      font-size: var(--t-2);
    }
    .rol__bajada {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .rol ul {
      display: grid;
      gap: var(--e-3);
      margin: 0;
      padding: var(--e-4) 0;
      border-top: 1px solid var(--c-borde);
      border-bottom: 1px solid var(--c-borde);
      list-style: none;
    }
    .rol li {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--e-2);
      align-items: start;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .rol li i {
      margin-top: 3px;
      color: var(--c-acento);
      font-size: var(--t-micro);
    }
    .rol .btn {
      justify-self: start;
    }

    .rasgos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
      gap: var(--e-3);
    }
    .rasgo {
      display: grid;
      gap: var(--e-2);
      align-content: start;
      padding: var(--e-4);
    }
    .rasgo i {
      color: var(--c-acento);
      font-size: var(--t-4);
    }
    .rasgo h3 {
      font-family: var(--fuente-texto);
      font-size: var(--t-4);
      font-weight: var(--peso-medio);
      letter-spacing: 0;
    }
    .rasgo p {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }

    .preguntas {
      display: grid;
      gap: var(--e-2);
      max-width: 920px;
    }
    .pregunta {
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
      background: var(--c-superficie);
    }
    .pregunta summary {
      display: flex;
      gap: var(--e-4);
      align-items: center;
      justify-content: space-between;
      min-height: 52px;
      padding: var(--e-3) var(--e-4);
      cursor: pointer;
      font-weight: var(--peso-medio);
      list-style: none;
    }
    .pregunta summary::-webkit-details-marker {
      display: none;
    }
    .pregunta summary i {
      flex: none;
      color: var(--c-texto-tenue);
      transition: transform var(--mov) var(--curva);
    }
    .pregunta[open] summary i {
      transform: rotate(45deg);
    }
    .pregunta p {
      max-width: var(--ancho-lectura);
      padding: 0 var(--e-4) var(--e-4);
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }

    .cierre {
      display: grid;
      gap: var(--e-4);
      justify-items: center;
      padding: var(--e-7) var(--e-5);
      text-align: center;
      background:
        radial-gradient(120% 160% at 50% 0%, var(--c-acento-tenue), transparent 68%),
        var(--c-superficie);
      border-color: color-mix(in srgb, var(--c-acento) 28%, var(--c-borde));
    }
    .cierre h2 {
      font-size: var(--t-2);
    }
    .cierre > p:not(.micro) {
      max-width: 52ch;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .cierre__cta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      justify-content: center;
      margin-top: var(--e-2);
    }

    @media (max-width: 1000px) {
      .evidencia {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--e-6);
      }
    }
    @media (max-width: 900px) {
      .seccion__cab {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--e-3);
      }
    }
    @media (max-width: 680px) {
      .seccion {
        padding: var(--e-6) var(--e-4);
      }
      .pasos li,
      .rol {
        padding: var(--e-4);
      }
    }
  `,
})
export class SeccionesInicio {
  protected readonly irA = irAAncla;

  protected readonly pasos: readonly Paso[] = [
    {
      numero: '01',
      titulo: 'Define el reto y la rúbrica',
      texto:
        'La empresa publica un ejercicio práctico. Cada criterio lleva peso y escala, y la rúbrica queda versionada para que un cambio no reescriba el pasado.',
    },
    {
      numero: '02',
      titulo: 'El candidato resuelve, sin atajos',
      texto:
        'Todos reciben el mismo reto. La entrega se verifica y se califica contra esa rúbrica, no contra una impresión de la primera entrevista.',
    },
    {
      numero: '03',
      titulo: 'La nota llega con su porqué',
      texto:
        'Puntaje sobre 100, desglose por criterio y la cita textual que sostiene cada uno. El ranking se arma con el mejor intento de cada persona.',
    },
  ];

  protected readonly garantias: readonly string[] = [
    'La nota final se compone de criterios con peso, no de una corazonada.',
    'Cada criterio muestra la cita de la entrega que lo justifica.',
    'El ranking conserva el mejor intento y deja ver los demás.',
    'La misma rúbrica se aplica a todos los candidatos de la vacante.',
  ];

  protected readonly beneficiosCandidato: readonly string[] = [
    'Resuelve retos reales, no tests de memoria.',
    'Mira tu nota, el desglose y la evidencia de cada criterio.',
    'Pide orientación al mentor sin recibir la respuesta.',
    'Decide qué permisos das y qué ve una empresa.',
  ];

  protected readonly beneficiosEmpresa: readonly string[] = [
    'Publica vacantes con rúbricas que tu equipo puede defender.',
    'Compara finalistas por puntaje, criterio y evidencia.',
    'Revela la identidad solo cuando vayas a decidir.',
    'Audita cada entrega y el estado de su evaluación.',
  ];

  protected readonly rasgos: readonly Rasgo[] = [
    {
      icono: 'pi-book',
      titulo: 'Rúbricas versionadas',
      texto:
        'Cambiar una regla no reescribe el pasado: cada entrega conserva la versión con la que se calificó.',
    },
    {
      icono: 'pi-chart-bar',
      titulo: 'Ranking por vacante',
      texto: 'El mejor intento de cada candidato, ordenado y con el desglose a un clic.',
    },
    {
      icono: 'pi-eye-slash',
      titulo: 'Identidad protegida',
      texto:
        'El ranking muestra alias; nombre y correo se revelan solo cuando la decisión lo exige.',
    },
    {
      icono: 'pi-shield',
      titulo: 'Señales de riesgo',
      texto: 'La entrega pasa por reglas de integridad y queda marcada si algo no cuadra.',
    },
    {
      icono: 'pi-comments',
      titulo: 'Mentor para candidatos',
      texto: 'Quien resuelve puede pedir orientación sin que el sistema le entregue la solución.',
    },
    {
      icono: 'pi-lock',
      titulo: 'Datos bajo control',
      texto:
        'Consentimientos por finalidad, cuenta anonimizable y tratamiento conforme a la Ley 1581.',
    },
  ];

  protected readonly preguntas: readonly Pregunta[] = [
    {
      pregunta: '¿La IA decide a quién contratar?',
      respuesta:
        'No. Califica cada entrega contra la rúbrica de la vacante y devuelve la nota con su evidencia. La decisión de avanzar, entrevistar o contratar sigue siendo del equipo humano, que ahora puede explicar por qué.',
    },
    {
      pregunta: '¿Qué pasa si una evaluación falla?',
      respuesta:
        'La entrega queda marcada como fallida y puede reintentarse sin gastar un intento. El fallo es del servicio de evaluación, no del candidato, y se distingue del resto de estados.',
    },
    {
      pregunta: '¿Puedo ocultar mi identidad en el ranking?',
      respuesta:
        'Sí. El ranking trabaja con un alias. El nombre y el correo solo se muestran cuando la empresa decide revelarlos para continuar el proceso.',
    },
    {
      pregunta: '¿Cómo se comprueba que la entrega es de la persona?',
      respuesta:
        'La verificación con cámara es opcional: se pide una foto al entregar y se conserva 90 días para prevenir suplantación. Si no la autorizas, la entrega se verifica sin cámara y la decisión sobre ese permiso queda registrada.',
    },
    {
      pregunta: '¿Dónde veo mis resultados y mis datos?',
      respuesta:
        'En «Mis resultados» están las notas con su desglose; en «Mi cuenta» están los consentimientos, la posibilidad de cambiarlos y la anonimización de la cuenta. No hay datos escondidos en pantallas que no puedas visitar.',
    },
    {
      pregunta: '¿Necesito instalar algo?',
      respuesta:
        'No. MeritIA funciona en el navegador y también como aplicación para Android. Es la misma cuenta y el mismo historial en los dos sitios.',
    },
  ];
}

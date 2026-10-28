import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, type OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API, Api, FalloDeApi } from '../../../nucleo/api/api';
import type { EntregaPropia, RetoDeLaVacante, Vacante } from '../../../nucleo/api/contrato';

/** Lo que el backend acepta. Se repite aquí para avisar ANTES de subir. */
const EXTENSIONES = ['zip', 'pdf', 'md', 'txt', 'ipynb', 'sql', 'json', 'csv', 'py', 'js', 'ts'];
const LIMITE_BYTES = 25 * 1024 * 1024;

/**
 * El reto del candidato: enunciado, rúbrica y entrega (B14 y B17).
 *
 * SON DOS MOCKUPS Y UNA SOLA PANTALLA, A PROPÓSITO
 *
 * B14 es «invitación a reto» y B17 «reto en curso». El backend no modela una
 * invitación como objeto ni una sesión cronometrada —ninguna de las dos existe
 * todavía—, así que separarlas daría dos pantallas que muestran lo mismo. Si
 * algún día la invitación caduca a las 72 h, como dice B14, esto se parte.
 *
 * LA RÚBRICA SE VE ANTES DE ENTREGAR, CON SUS PESOS
 *
 * Es la diferencia entre una prueba y un examen sorpresa, y es lo que permite
 * que el resultado se pueda discutir después. Va primero, antes del botón de
 * subir, porque leerla después de entregar no sirve de nada.
 *
 * LO QUE SE VALIDA AQUÍ TAMBIÉN LO VALIDA EL BACKEND
 *
 * La extensión y el tamaño se comprueban en el navegador **además** de en el
 * servidor, no en su lugar. Aquí es para no hacerle subir 25 MB a alguien para
 * decirle que no; quien protege es el backend, que no se fía del navegador.
 */
@Component({
  selector: 'app-reto',
  imports: [DatePipe],
  templateUrl: './reto.html',
  styleUrl: './reto.css',
})
export class Reto implements OnInit {
  readonly idVacante = input.required<string>();

  private readonly api = inject(Api);

  protected readonly vacante = signal<Vacante | null>(null);
  protected readonly retos = signal<readonly RetoDeLaVacante[]>([]);
  protected readonly entregas = signal<readonly EntregaPropia[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly archivo = signal<File | null>(null);
  protected readonly ejercicioElegido = signal<string | null>(null);
  protected readonly subiendo = signal(false);
  protected readonly entregado = signal(false);

  protected readonly cerrada = computed(() => this.vacante()?.estado === 'cerrada');

  /** Mis entregas de ese ejercicio, de la más reciente a la más antigua. */
  protected entregasDe(idEjercicio: string): EntregaPropia[] {
    return this.entregas()
      .filter((e) => e.idEjercicio === idEjercicio)
      .sort((a, b) => b.numeroIntento - a.numeroIntento);
  }

  /** Lo que falla del archivo elegido, o null si está bien. */
  protected readonly problemaDelArchivo = computed(() => {
    const f = this.archivo();
    if (!f) return null;

    const extension = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!EXTENSIONES.includes(extension)) {
      return `No se aceptan archivos .${extension}. Se aceptan: ${EXTENSIONES.join(', ')}.`;
    }
    if (f.size > LIMITE_BYTES) {
      return `El archivo pesa ${this.enMegas(f.size)} y el límite son 25 MB.`;
    }
    return null;
  });

  protected readonly puedeEntregar = computed(
    () =>
      !this.cerrada() &&
      this.archivo() !== null &&
      this.problemaDelArchivo() === null &&
      this.ejercicioElegido() !== null &&
      !this.subiendo(),
  );

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [vacante, retos, entregas] = await Promise.all([
        firstValueFrom(this.api.get<Vacante>(`/vacantes/${this.idVacante()}`)),
        firstValueFrom(this.api.get<RetoDeLaVacante[]>(`/vacantes/${this.idVacante()}/ejercicios`)),
        // `/entregas/vacante/{id}` es la vista del RECLUTADOR: lista las de
        // todo el mundo, y a un candidato le responde 403. La suya es
        // `/entregas/mias`, que acepta filtro por vacante.
        firstValueFrom(
          this.api.get<EntregaPropia[]>(`/entregas/mias?idVacante=${this.idVacante()}`),
        ),
      ]);
      this.vacante.set(vacante);
      this.retos.set(retos);
      this.entregas.set(entregas);
      // Con un solo reto, que es el caso normal, no se hace elegir.
      if (retos.length === 1) this.ejercicioElegido.set(retos[0].idEjercicio);
    } catch (fallo) {
      this.error.set(
        fallo instanceof FalloDeApi ? fallo.message : `No se pudo cargar el reto: ${String(fallo)}`,
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /** Se guarda el `<input>` para poder vaciarlo tras entregar. */
  private entradaDeArchivo: HTMLInputElement | null = null;

  protected elegirArchivo(evento: Event): void {
    this.entradaDeArchivo = evento.target as HTMLInputElement;
    this.archivo.set(this.entradaDeArchivo.files?.[0] ?? null);
    this.entregado.set(false);
  }

  protected async entregar(): Promise<void> {
    const archivo = this.archivo();
    const idEjercicio = this.ejercicioElegido();
    if (!archivo || !idEjercicio || !this.puedeEntregar()) return;

    this.subiendo.set(true);
    this.error.set(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append('idVacante', this.idVacante());
      cuerpo.append('idEjercicio', idEjercicio);
      cuerpo.append('archivo', archivo);

      // Con `fetch` y no con el cliente de la API: subir un archivo es
      // multipart, y el cliente pone `Content-Type: application/json`.
      // `credentials` va explícito porque aquí no pasa por el interceptor.
      const respuesta = await fetch(`${API}/entregas`, {
        method: 'POST',
        body: cuerpo,
        credentials: 'include',
      });
      if (!respuesta.ok) {
        const cuerpoError = (await respuesta.json()) as { mensaje?: string };
        throw new FalloDeApi(respuesta.status, cuerpoError.mensaje ?? respuesta.statusText);
      }

      this.archivo.set(null);
      // Tambien el `<input>`, o seguiria ensenando el nombre del archivo que
      // ya se entrego y pareceria que falta pulsar algo.
      if (this.entradaDeArchivo) this.entradaDeArchivo.value = '';
      this.entregado.set(true);
      this.entregas.set(
        await firstValueFrom(
          this.api.get<EntregaPropia[]>(`/entregas/mias?idVacante=${this.idVacante()}`),
        ),
      );
    } catch (fallo) {
      this.error.set(
        fallo instanceof FalloDeApi ? fallo.message : `No se pudo entregar: ${String(fallo)}`,
      );
    } finally {
      this.subiendo.set(false);
    }
  }

  protected enMegas(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected textoDelEstado(estado: string): string {
    switch (estado) {
      case 'recibida':
        return 'Recibida, esperando evaluación';
      case 'en_evaluacion':
        return 'En evaluación';
      case 'evaluada':
        return 'Evaluada';
      default:
        return 'No se pudo evaluar';
    }
  }

  protected readonly extensiones = EXTENSIONES.join(', ');
  protected readonly aceptadas = EXTENSIONES.map((e) => `.${e}`).join(',');
  protected readonly volverAMisRetos = '/mis-retos';
}

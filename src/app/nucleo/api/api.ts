import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import { entorno } from '../../../entornos/entorno';
import { comoErrorApi } from './errores';

type Parametros = Record<string, string | number | boolean | undefined>;

/**
 * Cliente HTTP del producto.
 *
 * Devuelve promesas y no observables: ninguna pantalla de MeritIA necesita un
 * flujo de varios valores, y las promesas se combinan con señales sin el ruido
 * de las suscripciones. Lo que sí hace, y por eso existe esta capa, es dejar
 * un único lugar donde se decide la URL base y la forma de los errores.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  readonly #http = inject(HttpClient);

  get<T>(ruta: string, parametros?: Parametros): Promise<T> {
    return this.#pedir(this.#http.get<T>(this.#url(ruta), { params: this.#params(parametros) }));
  }

  post<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.#pedir(this.#http.post<T>(this.#url(ruta), cuerpo ?? {}));
  }

  patch<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return this.#pedir(this.#http.patch<T>(this.#url(ruta), cuerpo));
  }

  put<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return this.#pedir(this.#http.put<T>(this.#url(ruta), cuerpo));
  }

  borrar<T>(ruta: string): Promise<T> {
    return this.#pedir(this.#http.delete<T>(this.#url(ruta)));
  }

  /** Envío multipart. El progreso real lo expone `subirConProgreso`. */
  subir<T>(ruta: string, formulario: FormData): Promise<T> {
    return this.#pedir(this.#http.post<T>(this.#url(ruta), formulario));
  }

  /**
   * Igual que `subir`, pero informando del avance: una carga de 25 MiB sin
   * indicador deja a la persona sin saber si el sistema la escuchó.
   */
  subirConProgreso<T>(ruta: string, formulario: FormData, avance: (porcentaje: number) => void) {
    return new Promise<T>((resolver, rechazar) => {
      this.#http
        .post<T>(this.#url(ruta), formulario, { reportProgress: true, observe: 'events' })
        .subscribe({
          next: (evento) => {
            if (evento.type === 1 && evento.total) {
              avance(Math.round((evento.loaded / evento.total) * 100));
            } else if (evento.type === 4) {
              avance(100);
              resolver(evento.body as T);
            }
          },
          error: (causa: unknown) => rechazar(comoErrorApi(causa)),
        });
    });
  }

  #url(ruta: string): string {
    return `${entorno.apiBase}${ruta}`;
  }

  #params(parametros?: Parametros): HttpParams {
    let salida = new HttpParams();
    for (const [clave, valor] of Object.entries(parametros ?? {})) {
      if (valor !== undefined && valor !== '') salida = salida.set(clave, String(valor));
    }
    return salida;
  }

  async #pedir<T>(origen: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(origen);
    } catch (causa) {
      throw comoErrorApi(causa);
    }
  }
}

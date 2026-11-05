import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const ACCESO = 'meritia.acceso';
const RENOVACION = 'meritia.renovacion';

export interface Tokens {
  acceso: string;
  renovacion: string;
}

/**
 * Dónde guarda la APK sus tokens: el KeyStore de Android, no el WebView.
 *
 * Se mantiene una copia en memoria para que el interceptor no espere a un
 * puente nativo en cada petición. Solo se usa en la APK; en web los tokens
 * son cookies HttpOnly y esta clase no se toca.
 */
@Injectable({ providedIn: 'root' })
export class AlmacenTokens {
  #cache: Tokens | null = null;

  /** Lectura síncrona para el interceptor; vale tras `cargar()`. */
  acceso(): string | null {
    return this.#cache?.acceso ?? null;
  }

  renovacion(): string | null {
    return this.#cache?.renovacion ?? null;
  }

  async cargar(): Promise<void> {
    try {
      const acceso = await SecureStorage.getItem(ACCESO);
      const renovacion = await SecureStorage.getItem(RENOVACION);
      this.#cache =
        typeof acceso === 'string' && typeof renovacion === 'string'
          ? { acceso, renovacion }
          : null;
    } catch {
      this.#cache = null;
    }
  }

  async guardar(tokens: Tokens): Promise<void> {
    this.#cache = tokens;
    await SecureStorage.setItem(ACCESO, tokens.acceso);
    await SecureStorage.setItem(RENOVACION, tokens.renovacion);
  }

  async borrar(): Promise<void> {
    this.#cache = null;
    try {
      await SecureStorage.removeItem(ACCESO);
      await SecureStorage.removeItem(RENOVACION);
    } catch {
      /* ya no estaban */
    }
  }
}

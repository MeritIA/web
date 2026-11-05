import { Injectable, inject } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Plataforma } from './plataforma';

/**
 * Abrir y guardar archivos sin que la pantalla sepa dónde corre.
 *
 * En web: ancla `download` y `window.open`. En la APK ninguna de las dos
 * funciona dentro del WebView, así que se abre el navegador del sistema o se
 * escribe el archivo y se ofrece la hoja de compartir.
 */
@Injectable({ providedIn: 'root' })
export class Archivos {
  readonly #plataforma = inject(Plataforma);

  /** Enlaces firmados de corta vida (entregas, adjuntos). */
  async abrir(url: string): Promise<void> {
    if (this.#plataforma.nativa()) {
      await Browser.open({ url });
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  async guardar(nombre: string, contenido: Blob | string, tipo: string): Promise<void> {
    if (!this.#plataforma.nativa()) {
      const blob =
        typeof contenido === 'string' ? new Blob([contenido], { type: tipo }) : contenido;
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      enlace.click();
      URL.revokeObjectURL(url);
      return;
    }

    const esTexto = typeof contenido === 'string';
    const { uri } = await Filesystem.writeFile({
      path: nombre,
      directory: Directory.Cache,
      data: esTexto ? contenido : await aBase64(contenido),
      ...(esTexto ? { encoding: Encoding.UTF8 } : {}),
    });
    await Share.share({ title: nombre, url: uri, dialogTitle: 'Guardar o compartir' });
  }
}

function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () =>
      resolver(typeof lector.result === 'string' ? (lector.result.split(',')[1] ?? '') : '');
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(blob);
  });
}

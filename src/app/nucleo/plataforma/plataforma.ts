import { Injectable, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { entorno } from '../../../entornos/entorno';

/**
 * Qué hay debajo de la aplicación: un navegador o la APK.
 *
 * Es la única puerta hacia los plugins nativos. Las pantallas preguntan
 * `nativa()` y no importan Capacitor, así que en web ningún plugin se invoca.
 */
@Injectable({ providedIn: 'root' })
export class Plataforma {
  /** Se decide por el entorno de compilación y se confirma con el runtime. */
  readonly nativa = signal(entorno.nativo && Capacitor.isNativePlatform());
  /** Alto del teclado en píxeles; 0 cuando está oculto. */
  readonly tecladoAlto = signal(0);

  /** Se llama una vez al arrancar. En web no hace nada. */
  async iniciar(volver: () => void): Promise<void> {
    if (!this.nativa()) return;

    // El botón «atrás» de Android: retrocede si hay a dónde, y si no, sale.
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) volver();
      else void App.exitApp();
    });

    await Keyboard.addListener('keyboardWillShow', (info) =>
      this.tecladoAlto.set(info.keyboardHeight),
    );
    await Keyboard.addListener('keyboardWillHide', () => this.tecladoAlto.set(0));

    await SplashScreen.hide();
  }
}

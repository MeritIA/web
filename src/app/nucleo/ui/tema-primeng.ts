import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

/**
 * Preset de PrimeNG alineado con los tokens de `styles/_tokens.scss`.
 *
 * El color de marca sale del acento de MeritIA; superficies, bordes y texto se
 * enlazan a los mismos custom properties (ver `_primeng.scss`), así el cambio de
 * tema claro/oscuro sigue siendo una sola decisión en `<html data-tema>`.
 */
export const PresetMeritIA = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ecfbf3',
      100: '#d0f5e1',
      200: '#a3ebc7',
      300: '#5fd49b',
      400: '#3fbf84',
      500: '#14825a',
      600: '#0f6a49',
      700: '#0b5539',
      800: '#094230',
      900: '#073525',
      950: '#04140d',
    },
    colorScheme: {
      light: {
        primary: {
          color: '#14825a',
          contrastColor: '#ffffff',
          hoverColor: '#0f6a49',
          activeColor: '#0b5539',
        },
      },
      dark: {
        primary: {
          color: '#5fd49b',
          contrastColor: '#04140d',
          hoverColor: '#7fe0b1',
          activeColor: '#a3ebc7',
        },
      },
    },
  },
});

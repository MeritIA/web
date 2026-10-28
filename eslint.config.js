// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * El mismo listón que el backend, no el que trae el andamiaje.
 *
 * `recommendedTypeChecked` en vez de `recommended`: las reglas que de verdad
 * encuentran errores —una promesa sin `await`, un `any` que se cuela desde una
 * respuesta HTTP— necesitan los tipos, y sin ellas el linter solo opina sobre
 * estilo. Cuesta que el análisis sea más lento; vale la pena en un front que
 * consume 47 operaciones de una API y donde un campo que cambia de forma no
 * da la cara hasta tres pantallas más allá.
 *
 * Las reglas de accesibilidad de plantilla vienen del andamiaje y se quedan:
 * las pantallas acaban en una APK y navegar con teclado o lector no es opcional.
 */
module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // Una promesa sin esperar dentro de un manejador de evento se traga el
      // error y la pantalla se queda como estaba, sin decir nada. Es el fallo
      // mas comun de un front que habla con una API, y el mas dificil de ver.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    // Las plantillas no se analizan con tipos: son HTML.
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  {
    // Ficheros de configuracion en CommonJS, fuera del programa de TypeScript.
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' } },
  },
]);

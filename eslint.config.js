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

      // `ignoreStatic` porque los 27 avisos que daba esta regla en este
      // proyecto eran todos `Validators.required`, `Validators.min(...)` y
      // compania: funciones ESTATICAS de Angular que no usan `this`, pasadas
      // como referencia tal y como documenta Angular. Son falsos positivos, y
      // dejarlos encendidos entrena a ignorar el linter. Lo que la regla si
      // sigue cazando --un metodo de instancia desligado de su objeto-- se
      // queda activo.
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],

      // Un `_` al desestructurar es la forma de decir "este campo lo tiro a
      // proposito". Sin esta excepcion habria que escribir codigo peor para
      // callar al linter.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    /**
     * El sistema de diseno no lleva prefijo, y es una decision.
     *
     * El prefijo `app-` existe para no chocar con elementos nativos ni con
     * componentes de terceros. Estas piezas son las primitivas del sistema de
     * diseno --`<boton>`, `<campo>`, `<desglose>`--, tienen nombre en
     * castellano como el resto del proyecto, y leerlas en una plantilla con
     * `app-` delante solo anade ruido. Las pantallas de funcionalidad SI llevan
     * prefijo: la regla sigue activa fuera de esta carpeta.
     */
    files: ['src/app/compartido/ui/**/*.ts'],
    rules: { '@angular-eslint/component-selector': 'off' },
  },
  {
    /**
     * Las pruebas se analizan con SU tsconfig.
     *
     * `tsconfig.spec.json` es el que incluye los `*.spec.ts` y el que anade los
     * tipos de vitest. El `projectService` no lo encuentra por su cuenta --no
     * esta referenciado desde el tsconfig raiz-- y sin esto el linter falla con
     * "was not found by the project service" en cada prueba, que parece un
     * error del codigo y es de configuracion.
     */
    files: ['**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['tsconfig.spec.json'],
        tsconfigRootDir: __dirname,
      },
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

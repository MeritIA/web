# MeritIA · web

Frontend de MeritIA. **Angular 22 + Capacitor**, sin renderizado en servidor.

## Por qué Angular y no Next.js

El *Project Charter* (v1.0) dice Next.js. El *Plan de Seguridad* (v1.0) dedica
su §7 entero a Angular y a la APK generada con Capacitor, y la EDT le asigna
los paquetes **3.1 y 3.2**. Se trabaja sobre Angular porque es lo único que
conserva la APK dentro del alcance: el Charter no menciona aplicación móvil en
ningún punto. **El Charter queda desactualizado en ese punto y el equipo
debería corregirlo formalmente.** La contradicción está escrita en
`backend/docs/arquitectura.md` §10.

**Sin SSR, y es una decisión:** Capacitor empaqueta una build estática. Con
renderizado en servidor habría dos builds distintas y la sesión viviría en dos
sitios, que es justo donde se cuelan los fallos de autenticación.

## Cómo se levanta

Hace falta el backend corriendo. Desde `../backend`:

```bash
docker compose up -d                    # postgres, redis, almacenamiento
npm run migration:run
node --env-file=.env dist/main.js       # ojo: ver «lo que falta»
```

Y aquí:

```bash
npm install
npm start                               # http://localhost:4200
npm run lint                            # mismo listón que el backend
npm run format:check
```

El backend ya trae `http://localhost:4200` en su lista blanca de orígenes de
desarrollo, así que no hay que tocar CORS.

## La sesión no se guarda aquí

En web el token viaja en una **cookie HttpOnly** y JavaScript no lo puede leer:
es el control central del paquete 3.5 del backend. Consecuencias que conviene
tener claras antes de tocar `nucleo/sesion`:

- El front **no puede** saber si hay sesión mirando el navegador. Lo pregunta:
  `GET /autenticacion/yo` responde 200 con la identidad o 401 sin ella.
- Nada se guarda en `localStorage` ni en `sessionStorage`. Sería un atajo que
  mentiría: la cookie puede vencer o cerrarse en otra pestaña, y el front
  seguiría pintando un panel que el servidor ya no sirve.
- Toda petición va con `withCredentials: true`, puesto una sola vez en
  `nucleo/api/api.ts`. Olvidarlo da un 401 que parece de permisos y es de
  transporte.
- En la APK es al revés: el token va en el cuerpo y lo guarda el KeyStore. Por
  eso el login manda `cliente: 'web'` explícito y no se adivina por User-Agent.

**Los guardias de ruta no son seguridad.** Solo deciden qué se pinta. Quien
protege los datos es el backend, que devuelve 404 —no 403— ante un recurso de
otra empresa.

## Qué hay construido

| Pantalla | Ruta | Estado |
|---|---|---|
| Entrar | `/entrar` | ✅ contra `POST /autenticacion/login` |
| A02 · Panel de vacantes | `/panel` | ✅ contra `GET /reportes/panel`, una sola llamada |

El MVP acordado son **diez pantallas** (`backend/docs/matriz-pantallas.md` §8):
A01 → A02 → A03 → A04 → A06 → A07 → A08 y B11 → B14 → B17 → B22.

### El panel, en detalle

Sale de **una sola llamada**. Pedirlo vacante por vacante es lo que esta
pantalla no se puede permitir con veinte procesos abiertos.

Tres casos que la pantalla distingue a propósito, y que es fácil romper:

1. **`avance === null` no es `0`.** Null es «no has invitado a nadie» y cero es
   «invitaste y nadie ha avanzado». Una barra vacía en el primer caso diría que
   el proceso está parado cuando no ha empezado.
2. **Un cierre estimado en el pasado se muestra**, marcado. El backend acepta
   fechas pasadas justamente para que el panel pueda enseñar que un proceso se
   venció (D-13).
3. **Evaluar a más gente de la planeada no es un error.** `finalistasAEvaluar`
   es un plan, no un tope (D-12).

## Lo que falta, y no es poco

- **Pruebas.** El andamiaje trae Vitest —el mismo que el backend— y no hay ni
  una prueba escrita. Es el hueco más grande: por eso la CI de aquí tiene tres
  verificaciones y la del backend cinco.
- **Capacitor.** Los paquetes 3.1 y 3.2 incluyen la APK, y todavía no está.
- **Las otras ocho pantallas del MVP.**
- **Configuración por entorno.** `API` está fija en `nucleo/api/api.ts`; para
  desplegar hay que reemplazarla por configuración de build.

### Un tropiezo del backend que se encontró montando esto

`npm start` en el backend **falla** con `SASL: client password must be a
string`: `nest start` no carga `.env` y algo lee `process.env` antes de que
`ConfigModule` lo rellene. El rodeo es `node --env-file=.env dist/main.js`,
igual que hace `migration:run`. Conviene arreglarlo en los scripts del backend:
hoy quien clone el repositorio y haga `npm start` recibe un error que no dice
lo que pasa.

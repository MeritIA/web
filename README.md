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

Hace falta el backend corriendo. Si es la primera vez, su README tiene el
arranque de cero —hay claves que generar—; si ya lo tienes, desde `../backend`:

```bash
docker compose up -d                    # postgres, redis, almacenamiento
npm run migration:run
node --env-file=.env dist/main.js       # ojo: ver «lo que falta»
```

Y datos para mirar, porque **el front vacío no se distingue del front roto**:

```bash
node --env-file=.env scripts/sembrar-demo.mjs
```

Deja tres vacantes en estados distintos a propósito: una a medias, una vencida
y una sin nadie invitado. Entra con:

| Quién | Correo | Contraseña |
|---|---|---|
| Reclutadora | `laura@empresa-demo.com` | `una-frase-larga-y-dificil` |
| Candidatos | `ana@`, `luis@`, `sara@`, `diego@` `ejemplo.com` | la misma |

Para el flujo del candidato entra con `ana@ejemplo.com`: está invitada a los
tres procesos y tiene entregas ya evaluadas, así que B22 muestra puntaje y
desglose por criterio.

**El puesto no sale todavía, y no es un fallo.** «Puesto 2 de 15» aparece
cuando la empresa cierra el proceso: hasta entonces hay gente que puede
entregar y el puesto cambiaría. Para verlo, cierra una vacante antes desde A08
con la reclutadora. Ese recorrido —cerrar como empresa, mirar el resultado como
candidato— es el que más vale la pena probar, porque es donde se rompió una vez:
el correo de cierre prometía un resultado al que el candidato no podía llegar.

Y **necesita el PR #24 del backend**, que todavía está abierto: sin él, el
proceso cerrado desaparece de «Mis retos» y no hay forma de llegar al
resultado. Si lo pruebas contra `main`, eso es lo que verás.

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

**Las diez pantallas del MVP, recorridas en el navegador contra el backend
real.** La lista acordada es `backend/docs/matriz-pantallas.md` §8.

> **Ojo antes de clonar:** cuatro commits —A07, A08, el flujo entero del
> candidato y el arreglo del ranking— están en `feat/ranking-de-finalistas` y
> **no en `main`**. El PR #1 se mergeó antes de que se empujaran. Si ves dos
> pantallas, es eso.

| Pantalla | Ruta | Con qué habla |
|---|---|---|
| Entrar | `/entrar` | `POST /autenticacion/login` |
| **B11** · Crear cuenta | `/crear-cuenta` | `POST /autenticacion/registro` |
| **A02** · Panel de vacantes | `/panel` | `GET /reportes/panel`, una sola llamada |
| **A06** · Ranking de finalistas | `/vacantes/:idVacante/ranking` | `GET /reportes/vacantes/{id}`, `.../exportar`, `.../revelar` |
| **A07** · Ver entrega | `/vacantes/:idVacante/candidatos/:idCandidato` | `GET /reportes/.../candidatos/{id}`, `GET /entregas/{id}/descarga` |
| **A08** · Contratar y cerrar | `/vacantes/:idVacante/cierre` | `POST .../contratar`, `.../cerrar`, `GET /notificaciones/vacantes/{id}` |
| Mis retos | `/mis-retos` | `GET /vacantes`, `GET /entregas/mias` |
| **B14 + B17** · Reto | `/retos/:idVacante` | `GET /vacantes/{id}/ejercicios`, `POST /entregas` |
| **B22** · Mi resultado | `/retos/:idVacante/resultado` | `GET /evaluaciones/entrega/{id}`, `.../mi-puesto` |

**A01, A03 y A04 no tienen pantalla, y es a propósito.** A01 porque el backend
no permite auto-registro de empresas —solo un administrador de plataforma crea
una— y A04 porque es la del pago, que no existe. La empresa y las vacantes las
pone `sembrar-demo.mjs`.

### Tres detalles que es fácil romper

**El panel sale de una sola llamada.** Pedirlo vacante por vacante es lo que
esta pantalla no se puede permitir con veinte procesos abiertos. Y distingue
tres casos a propósito:

1. **`avance === null` no es `0`.** Null es «no has invitado a nadie» y cero es
   «invitaste y nadie ha avanzado». Una barra vacía en el primer caso diría que
   el proceso está parado cuando no ha empezado.
2. **Un cierre estimado en el pasado se muestra**, marcado. El backend acepta
   fechas pasadas justamente para que el panel pueda enseñar que un proceso se
   venció (D-13).
3. **Evaluar a más gente de la planeada no es un error.** `finalistasAEvaluar`
   es un plan, no un tope (D-12).

**El ranking carga en `ngOnInit`, no en el constructor.** `input.required()` no
tiene valor cuando corre el constructor y lanza antes de pedir nada: la
pantalla salía en blanco sin un solo error en la red. Si mueves esa llamada,
vuelve el fallo.

**Descargar un entregable son dos pasos.** `GET /entregas/{id}/descarga` no
devuelve el archivo: devuelve `{url, expiraEnSegundos}`. Un `<a href>` directo
descarga un JSON. La pantalla pide el enlace al pulsar y lo abre, con un enlace
de reserva si el navegador bloquea la ventana.

## Lo que falta, y no es poco

1. **Ninguna prueba.** El andamiaje trae Vitest —el mismo que el backend— y no
   hay una escrita. Es el hueco más grande: por eso la CI de aquí tiene tres
   verificaciones y la del backend cinco. Por dónde empezar: `nucleo/sesion`,
   que es donde el guardia redirige recordando a dónde ibas y donde un fallo no
   se ve a simple vista.
2. **`API` está fija** en `nucleo/api/api.ts` como
   `http://localhost:3000/api/v1`. Para desplegar tiene que ser `/api/v1`,
   relativo al mismo origen, porque la cookie va con `SameSite=strict` y desde
   otro dominio no viajaría nunca. **Son dos líneas y es lo único que impide
   desplegar el front.**
3. **Capacitor y la APK.** Paquetes 3.1 y 3.2 de la EDT.
4. **Sin diseño.** Las diez pantallas son HTML con estilos mínimos: funcionan y
   no se parecen a los mockups de Figma.

El estado de los tres repositorios, junto:
[`backend/docs/estado-del-proyecto.md`](../backend/docs/estado-del-proyecto.md).

### Dos tropiezos del backend que se encontraron montando esto

**`npm start` falla** con `SASL: client password must be a string`: `nest
start` no carga `.env`. El rodeo es `node --env-file=.env dist/main.js`, igual
que hace `migration:run`. Conviene arreglarlo en los scripts del backend: hoy
quien clone el repositorio y haga `npm start` recibe un error que no dice lo que
pasa.

**El candidato no podía ver su resultado** después de que se cerrara el
proceso, aunque el correo de cierre se lo prometía: el listado de vacantes
filtraba solo las publicadas. Arreglado en el backend (PR #24). El backend
estaba bien pieza por pieza y la promesa se rompía *entre* dos piezas, que es
lo que recorrer el producto encuentra y una prueba unitaria no.

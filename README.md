# NezkaWeb

Versión web de la app de **Elpidio Jr. Produce Co.** para gestionar clientes, productos y estimados (proformas). Reemplaza poco a poco a la app de escritorio [nezka-invoice](https://github.com/rcorzogutierrez/nezka-invoice).

- **Angular 22**: componentes standalone, sin zone.js, signals, Signal Forms y rutas con carga diferida.
- **Firebase** con la librería oficial `firebase` (sin AngularFire): Auth con correo y contraseña, Firestore y Hosting.
- **Tailwind CSS v4** con los colores de la proforma (azul `#1e3f9e`, rojo `#d7191f`) definidos en `src/styles.css`.
- Iconos de **@lucide/angular**.

## Qué hay hoy

- **Acceso** (`/acceso`): iniciar sesión, crear cuenta y recuperar la contraseña por correo. Mensajes de error en español y sin revelar si un correo tiene cuenta.
- **Rutas protegidas**: quien no ha iniciado sesión va a `/acceso` y, al entrar, vuelve a la página que quería abrir.
- **Marco de la app**: menú lateral con Clientes, Productos, Estimados y Catálogo (en el teléfono se abre con el botón de menú), usuario actual y cerrar sesión. Las secciones todavía muestran lo que traerán cuando pasen desde la app de escritorio.

## Trabajar en local

Requisitos: Node 22.12 o superior y Java 21 (solo para el emulador de Firestore).

```bash
npm install
npm run emulators   # Auth y Firestore locales, en otra terminal
npm start           # http://localhost:4200
```

En desarrollo la app usa los **emuladores de Firebase** con el proyecto `demo-nezka`, así que las cuentas que crees en local no tocan el proyecto real. La interfaz de los emuladores está en http://localhost:4000.

## Calidad

| Comando           | Qué hace                                                 |
| ----------------- | -------------------------------------------------------- |
| `npm test`        | Pruebas unitarias con Vitest (modo observación)          |
| `npm run test:ci` | Pruebas una vez, con cobertura en `coverage/`            |
| `npm run lint`    | ESLint con las reglas de angular-eslint y accesibilidad  |
| `npm run format`  | Prettier (ordena también las clases de Tailwind)         |
| `npm run check`   | Todo lo anterior y el build, igual que en GitHub Actions |

Cada pull request pasa por el flujo `CI` de GitHub Actions.

## Publicar en Firebase Hosting

1. En la consola de Firebase del proyecto `nezka-web`, activa **Authentication › Método de acceso › Correo electrónico/contraseña** y crea la base de datos de **Firestore**.
2. Inicia sesión una vez con `npx firebase login`.
3. `npm run deploy` compila la app y publica Hosting y las reglas de Firestore.

La configuración web de Firebase está en `src/environments/environment.ts`. No es secreta: los datos los protegen Firebase Auth y las reglas de `firestore.rules`.

## Estructura

```
src/app/
  core/firebase/   Inicializa Firebase (Auth) como proveedores de Angular
  core/auth/       Sesión con signals, guards y mensajes de error
  features/auth/   Iniciar sesión, crear cuenta y recuperar contraseña
  layout/          Marco de la app con el menú lateral
  shared/ui/       Campo de texto y avisos de formulario
src/testing/       Dobles de prueba (AuthService sin Firebase)
```

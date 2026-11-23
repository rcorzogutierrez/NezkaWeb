# NezkaWeb

Versión web de la app de **Elpidio Jr. Produce Co.** para gestionar clientes, productos y estimados (proformas). Reemplaza poco a poco a la app de escritorio [nezka-invoice](https://github.com/rcorzogutierrez/nezka-invoice).

- **Angular 22**: componentes standalone, sin zone.js, signals, Signal Forms y rutas con carga diferida.
- **Firebase** con la librería oficial `firebase` (sin AngularFire): Auth con correo y contraseña, Firestore y Hosting.
- **Tailwind CSS v4** con los colores de la proforma (azul `#1e3f9e`, rojo `#d7191f`) definidos en `src/styles.css`.
- Iconos de **@lucide/angular**.

## Qué hay hoy

- **Acceso** (`/login`, `/forgot-password`): iniciar sesión con correo y contraseña y recuperar la contraseña por correo. No hay registro público.
- **Primer administrador** (`/setup`): la primera vez, la pantalla de acceso ofrece crear la cuenta de administrador. Después de eso, `/setup` deja de existir.
- **Usuarios** (`/users`, `/users/new`, solo administradores): el administrador agrega personas con nombre, correo y rol (administrador o usuario). Firebase les envía un correo para elegir su contraseña. Se pueden activar, desactivar, cambiar de rol y reenviar el correo. Las cuentas no se borran.
- **Sin acceso** (`/no-access`): una cuenta de Firebase sin perfil activo en `users/{uid}` no entra a la app.
- **Inglés y español**: el selector de idioma está en el menú y en las pantallas de acceso. Se recuerda en el navegador; la primera vez se usa el idioma del navegador. Todas las rutas están en inglés.
- **Clientes** (`/clients`, `/clients/new`, `/clients/:id`, `/clients/import`): lista con búsqueda (sin importar mayúsculas ni acentos) y filtro de activos e inactivos, que se guardan en la URL. Formulario con los mismos campos que la app de escritorio, aviso de nombre duplicado y eliminación solo para administradores. Importación de la lista de clientes de QuickBooks (Excel, CSV o IIF) con vista previa, con las mismas reglas que la app de escritorio.
- **Marco de la app**: menú lateral con Clientes, Productos, Estimados y Catálogo. Productos, Estimados y Catálogo todavía muestran lo que traerán cuando pasen desde la app de escritorio.

## Trabajar en local

Requisitos: Node 22.12 o superior y Java 21 (solo para el emulador de Firestore).

```bash
npm install
npm run emulators   # Auth y Firestore locales, en otra terminal
npm start           # http://localhost:4200
```

En desarrollo la app usa los **emuladores de Firebase** con el proyecto `demo-nezka`, así que las cuentas que crees en local no tocan el proyecto real. La interfaz de los emuladores está en http://localhost:4000.

## Calidad

| Comando              | Qué hace                                                  |
| -------------------- | --------------------------------------------------------- |
| `npm test`           | Pruebas unitarias con Vitest (modo observación)           |
| `npm run test:ci`    | Pruebas una vez, con cobertura en `coverage/`             |
| `npm run lint`       | ESLint con las reglas de angular-eslint y accesibilidad   |
| `npm run test:rules` | Pruebas de `firestore.rules` contra el emulador (Java 21) |
| `npm run format`     | Prettier (ordena también las clases de Tailwind)          |
| `npm run check`      | Todo lo anterior y el build, igual que en GitHub Actions  |

Cada pull request pasa por el flujo `CI` de GitHub Actions.

## Publicar en Firebase Hosting

Una sola vez, en el proyecto `nezka-web`:

1. **Authentication › Método de acceso**: activa Correo electrónico/contraseña.
2. **Firestore Database**: crea la base de datos.
3. Crea una cuenta de servicio en Google Cloud (IAM › Cuentas de servicio) con los roles Firebase Hosting Admin, Firebase Rules Admin, API Keys Viewer, Service Account User y Service Usage Consumer. Descarga una clave JSON.
4. En GitHub, en **Settings › Secrets and variables › Actions**, crea el secreto `FIREBASE_SERVICE_ACCOUNT` con el contenido de ese JSON. Luego borra el archivo.

Desde entonces, cada fusión a `main` publica Hosting y las reglas de Firestore con el flujo `Deploy`. Sin el secreto el flujo se omite. También se puede publicar a mano con `npx firebase login` y `npm run deploy`.

Después del primer deploy, abre el sitio y usa el enlace **Crea la cuenta de administrador** de la pantalla de acceso para crear el primer administrador.

La configuración web de Firebase está en `src/environments/environment.ts`. No es secreta: los datos los protegen Firebase Auth y las reglas de `firestore.rules`.

## Estructura

```
src/app/
  core/firebase/   Firebase como proveedores de Angular; Firestore se carga bajo demanda
  core/auth/       Sesión con signals, guards y mensajes de error
  core/users/      Perfiles en Firestore y alta de usuarios
  core/clients/    Modelo y servicio de clientes en Firestore
  core/i18n/       Textos en español e inglés y el servicio de idioma
  features/auth/   Acceso, contraseña olvidada, primer administrador, sin acceso
  features/users/  Lista y alta de usuarios
  features/clients/ Lista y formulario de clientes
  layout/          Marco de la app con el menú lateral
  shared/ui/       Campo de texto y avisos de formulario
src/testing/       Dobles de prueba (AuthService y UsersService sin Firebase)
firestore-tests/   Pruebas de las reglas de seguridad
```

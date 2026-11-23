import { type Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

const upcoming = () =>
  import('./features/placeholder/upcoming-section').then((m) => m.UpcomingSection);

export const routes: Routes = [
  {
    path: 'acceso',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: '',
        title: 'Iniciar sesión',
        loadComponent: () => import('./features/auth/login').then((m) => m.Login),
      },
      {
        path: 'registro',
        title: 'Crear cuenta',
        loadComponent: () => import('./features/auth/register').then((m) => m.Register),
      },
      {
        path: 'recuperar',
        title: 'Recuperar contraseña',
        loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
      },
    ],
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'clientes' },
      {
        path: 'clientes',
        title: 'Clientes',
        loadComponent: upcoming,
        data: {
          title: 'Clientes',
          summary: 'Crea y mantén los clientes a los que emites proformas y facturas.',
          features: [
            'Crear clientes con contacto, correo, teléfonos, dirección y Tax ID.',
            'Editar, marcar como inactivos o eliminar los existentes.',
            'Buscar por nombre, contacto, correo, teléfono, ciudad o Tax ID.',
            'Importar la lista de clientes exportada de QuickBooks.',
          ],
        },
      },
      {
        path: 'productos',
        title: 'Productos',
        loadComponent: upcoming,
        data: {
          title: 'Productos',
          summary: 'El catálogo de productos con su foto, UPC, tamaño, pack y precio por caja.',
          features: [
            'Ver los productos del catálogo con su foto y referencia.',
            'Agregar, editar, desactivar o eliminar productos.',
            'Encontrar los productos a los que les falta UPC u otro dato.',
          ],
        },
      },
      {
        path: 'estimados',
        title: 'Estimados',
        loadComponent: upcoming,
        data: {
          title: 'Estimados',
          summary: 'Proformas por cliente, con la serie PF-año-número y sus totales.',
          features: [
            'Crear estimados buscando productos del catálogo.',
            'Editar cajas y precio por caja con los totales al día.',
            'Ver, imprimir y guardar el PDF con el formato de la proforma.',
          ],
        },
      },
      {
        path: 'catalogo',
        title: 'Catálogo',
        loadComponent: upcoming,
        data: {
          title: 'Catálogo',
          summary: 'La lista de productos para entregar a los clientes, con o sin precios.',
          features: [
            'Elegir qué productos entran en el catálogo.',
            'Mostrar u ocultar los precios por caja.',
            'Imprimir o guardar el catálogo en PDF.',
          ],
        },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

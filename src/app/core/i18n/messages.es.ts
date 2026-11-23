/** Spanish texts. This file defines the shape every other language must match. */
export const es = {
  app: {
    name: 'Elpidio Jr. Produce',
    company: 'Elpidio Jr. Produce Co.',
    tagline: 'Wholesale Fresh Fruits, Vegetables & Groceries',
    address: '5400 NW 32nd Ct · Miami, FL',
    skipToContent: 'Saltar al contenido',
  },
  language: {
    label: 'Idioma',
    es: 'Español',
    en: 'English',
  },
  auth: {
    statement: 'Clientes, productos y proformas en un solo lugar.',
    pitch:
      'La oficina de Elpidio Jr. Produce Co. ahora también en el navegador: los mismos datos desde la oficina, la bodega o el teléfono.',
    email: 'Correo',
    password: 'Contraseña',
    name: 'Nombre',
    confirmPassword: 'Repite la contraseña',
    passwordHint: (min: number) => `Al menos ${min} caracteres.`,
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    login: {
      title: 'Inicia sesión',
      intro: 'Entra con tu correo y tu contraseña.',
      forgot: '¿Olvidaste tu contraseña?',
      submit: 'Entrar',
      submitting: 'Entrando…',
      noAccount: '¿No tienes cuenta? Pídela al administrador.',
      firstRun: 'Es la primera vez que se usa la app.',
      firstRunLink: 'Crea la cuenta de administrador',
    },
    reset: {
      title: 'Recupera tu contraseña',
      intro: 'Te enviamos un enlace para que elijas una contraseña nueva.',
      submit: 'Enviar enlace',
      submitting: 'Enviando…',
      sent: (email: string) =>
        `Si ${email} tiene una cuenta, el enlace ya va en camino. Revisa también la carpeta de correo no deseado.`,
      back: 'Volver a iniciar sesión',
    },
    setup: {
      title: 'Primera cuenta de administrador',
      intro:
        'Esta cuenta podrá crear las cuentas de las demás personas. Solo se configura una vez.',
      submit: 'Crear cuenta de administrador',
      submitting: 'Creando cuenta…',
      haveAccount: '¿Ya tienes cuenta?',
      loginLink: 'Inicia sesión',
    },
    noAccess: {
      title: 'Tu cuenta no tiene acceso',
      body: (email: string) =>
        `Iniciaste sesión como ${email}, pero un administrador todavía no te ha dado acceso o lo desactivó. Pídele que revise tu cuenta en Usuarios.`,
      logout: 'Cerrar sesión',
    },
  },
  validation: {
    required: 'Este campo es obligatorio.',
    email: 'Ese correo no tiene un formato válido.',
    minLength: (min: number) => `Usa al menos ${min} caracteres.`,
    mismatch: 'Las contraseñas no coinciden.',
    maxLength: (max: number) => `Usa como máximo ${max} caracteres.`,
  },
  errors: {
    invalidCredentials: 'El correo o la contraseña no son correctos.',
    invalidEmail: 'Ese correo no tiene un formato válido.',
    userDisabled: 'Esta cuenta está desactivada. Pide al administrador que la active.',
    emailInUse: 'Ya existe una cuenta con ese correo.',
    weakPassword: 'La contraseña es muy débil. Usa al menos 8 caracteres.',
    tooManyRequests: 'Demasiados intentos seguidos. Espera unos minutos o recupera la contraseña.',
    network: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
    notEnabled: 'El acceso con correo y contraseña no está activado en Firebase.',
    permissionDenied: 'No tienes permiso para hacer esto.',
    unknown: 'No se pudo completar la operación. Inténtalo de nuevo.',
  },
  nav: {
    sections: 'Secciones',
    admin: 'Administración',
    clients: 'Clientes',
    products: 'Productos',
    estimates: 'Estimados',
    catalog: 'Catálogo',
    users: 'Usuarios',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    logout: 'Cerrar sesión',
  },
  upcoming: {
    heading: 'Llega en una próxima entrega',
    intro: 'Esta sección todavía vive en la app de escritorio. Cuando pase a la web podrás:',
    products: {
      summary: 'El catálogo de productos con su foto, UPC, tamaño, pack y precio por caja.',
      features: [
        'Ver los productos del catálogo con su foto y referencia.',
        'Agregar, editar, desactivar o eliminar productos.',
        'Encontrar los productos a los que les falta UPC u otro dato.',
      ],
    },
    estimates: {
      summary: 'Proformas por cliente, con la serie PF-año-número y sus totales.',
      features: [
        'Crear estimados buscando productos del catálogo.',
        'Editar cajas y precio por caja con los totales al día.',
        'Ver, imprimir y guardar el PDF con el formato de la proforma.',
      ],
    },
    catalog: {
      summary: 'La lista de productos para entregar a los clientes, con o sin precios.',
      features: [
        'Elegir qué productos entran en el catálogo.',
        'Mostrar u ocultar los precios por caja.',
        'Imprimir o guardar el catálogo en PDF.',
      ],
    },
  },
  clients: {
    title: 'Clientes',
    intro: 'Los clientes a los que emites proformas y facturas.',
    new: 'Nuevo cliente',
    search: 'Buscar',
    searchPlaceholder: 'Nombre, contacto, correo, ciudad…',
    filterLabel: 'Mostrar',
    filters: { all: 'Todos', active: 'Activos', inactive: 'Inactivos' },
    caption: 'Clientes',
    colClient: 'Cliente',
    colContact: 'Contacto',
    colPhone: 'Teléfono',
    colLocation: 'Ubicación',
    colStatus: 'Estado',
    colActions: 'Acciones',
    active: 'Activo',
    inactive: 'Inactivo',
    edit: 'Editar',
    editNamed: (name: string) => `Editar ${name}`,
    loading: 'Cargando clientes…',
    loadFailed: 'No se pudo cargar la lista de clientes. Revisa tu conexión y recarga la página.',
    showing: (shown: number, total: number) =>
      shown === total
        ? `${total} ${total === 1 ? 'cliente' : 'clientes'}`
        : `Mostrando ${shown} de ${total} clientes`,
    emptyTitle: 'Todavía no hay clientes',
    emptyBody:
      'Agrega el primero a mano o importa la lista de QuickBooks. Sus datos salen en el bloque CUSTOMER de cada proforma.',
    noMatchesTitle: 'Ningún cliente coincide',
    noMatchesBody: (search: string) =>
      search
        ? `No encontramos clientes con «${search}» en este filtro.`
        : 'No hay clientes en este filtro.',
    clearSearch: 'Ver todos los clientes',
    created: (name: string) => `Guardamos a ${name}.`,
    updated: (name: string) => `Guardamos los cambios de ${name}.`,
    deleted: (name: string) => `Eliminamos a ${name}.`,
    import: {
      title: 'Importar clientes de QuickBooks',
      open: 'Importar de QuickBooks',
      intro:
        'Elige la lista de clientes exportada de QuickBooks. Los que ya existen (mismo nombre) no se duplican.',
      howTitle: 'Cómo exportar la lista',
      howDesktop:
        'QuickBooks Desktop: Customers › Customer Center › Excel › Export Customer List, y guarda como Excel o CSV. También sirve File › Utilities › Export › Lists to IIF Files, marcando Customer List.',
      howOnline: 'QuickBooks Online: Sales › Customers › Export.',
      choose: 'Elegir archivo',
      chooseAnother: 'Elegir otro archivo',
      drop: 'o arrástralo aquí',
      formats: 'Excel (.xlsx, .xlsm), CSV o IIF',
      reading: 'Leyendo el archivo…',
      caption: 'Clientes encontrados en el archivo',
      colStatus: 'Estado',
      statusNew: 'Nuevo',
      skip: { noName: 'Sin nombre', exists: 'Ya existe', repeated: 'Repetido en el archivo' },
      summary: (fresh: number, skipped: number, jobs: number) =>
        [
          `${fresh} ${fresh === 1 ? 'cliente nuevo' : 'clientes nuevos'}`,
          skipped ? `${skipped} se ${skipped === 1 ? 'omite' : 'omiten'}` : '',
          jobs
            ? `${jobs} ${jobs === 1 ? 'trabajo' : 'trabajos'} (Customer:Job) no se ${jobs === 1 ? 'importa' : 'importan'}`
            : '',
        ]
          .filter(Boolean)
          .join(' · '),
      submit: (n: number) =>
        n ? `Importar ${n} ${n === 1 ? 'cliente' : 'clientes'}` : 'Importar clientes',
      submitting: 'Importando…',
      cancel: 'Cancelar',
      done: (n: number) => `Importamos ${n} ${n === 1 ? 'cliente' : 'clientes'} de QuickBooks.`,
      errors: {
        noNameColumn:
          'No encontramos la columna con el nombre del cliente (Customer o Name). Revisa que sea la lista de clientes exportada de QuickBooks.',
        oldExcel:
          'Los archivos .xls (Excel 97-2003) no se pueden leer. Expórtalo como CSV o guárdalo en Excel como .xlsx.',
        noIifCustomers: 'El archivo IIF no tiene una lista de clientes (sección !CUST).',
        unreadable: 'No se pudo leer el archivo. Revisa que no esté dañado y vuelve a intentarlo.',
      },
      notes: {
        otherEmails: 'Otros correos',
        website: 'Sitio web',
        invalidEmail: 'Correo no válido en QuickBooks',
        otherPhone: 'Otro teléfono',
        fax: 'Fax',
        otherContact: 'Otro contacto',
        terms: 'Términos de pago',
        account: 'Cuenta',
        shipTo: 'Enviar a',
      },
    },
    form: {
      newTitle: 'Nuevo cliente',
      editTitle: 'Editar cliente',
      intro:
        'Estos datos aparecen en el bloque CUSTOMER de las proformas y facturas. Solo el nombre es obligatorio.',
      back: 'Volver a clientes',
      general: 'Datos generales',
      contact: 'Contacto',
      address: 'Dirección',
      notesSection: 'Notas',
      name: 'Nombre del cliente',
      branch: 'Sucursal o razón social',
      contactName: 'Persona de contacto',
      taxId: 'Tax ID / EIN',
      email: 'Correo',
      phone: 'Teléfono',
      mobile: 'Celular',
      street: 'Dirección',
      city: 'Ciudad',
      state: 'Estado',
      zipCode: 'Código postal',
      country: 'País',
      notes: 'Notas',
      notesHint: 'Condiciones de pago, horarios de entrega…',
      active: 'Cliente activo',
      activeHint: 'Los clientes inactivos no se ofrecen al crear estimados.',
      submit: 'Guardar cliente',
      submitting: 'Guardando…',
      cancel: 'Cancelar',
      notFound: 'Ese cliente no existe o lo eliminaron.',
      duplicate: (name: string) =>
        `Ya existe un cliente llamado «${name}». Si es otro cliente, vuelve a pulsar «Guardar de todos modos».`,
      saveAnyway: 'Guardar de todos modos',
      delete: 'Eliminar cliente',
      deleteTitle: (name: string) => `¿Eliminar a ${name}?`,
      deleteBody:
        'Se borra para siempre. Si solo dejaste de venderle, desmarca «Cliente activo» y conserva su historial.',
      deleteConfirm: 'Eliminar',
      deleting: 'Eliminando…',
    },
  },
  users: {
    title: 'Usuarios',
    intro: 'Las personas que pueden entrar a la app. Solo los administradores ven esta sección.',
    new: 'Nuevo usuario',
    caption: 'Usuarios de la app',
    colName: 'Nombre',
    colRole: 'Rol',
    colStatus: 'Estado',
    colActions: 'Acciones',
    you: 'Tú',
    roleOf: (name: string) => `Rol de ${name}`,
    ownRole: 'No puedes cambiar tu propio rol',
    active: 'Activo',
    inactive: 'Inactivo',
    activate: 'Activar',
    deactivate: 'Desactivar',
    resend: 'Reenviar correo',
    loading: 'Cargando usuarios…',
    loadFailed: 'No se pudo cargar la lista de usuarios. Revisa tu conexión y recarga la página.',
    count: (total: number, inactive: number) =>
      `${total} ${total === 1 ? 'usuario' : 'usuarios'}` +
      (inactive ? ` · ${inactive} ${inactive === 1 ? 'inactivo' : 'inactivos'}` : ''),
    roles: { admin: 'Administrador', user: 'Usuario' },
    roleHelp: {
      user: 'Trabaja con clientes, productos, estimados y catálogo.',
      admin: 'Además crea usuarios y administra su acceso.',
    },
    roleChanged: (name: string, role: string) => `${name} ahora es ${role.toLowerCase()}.`,
    activated: (name: string) => `${name} vuelve a tener acceso.`,
    deactivated: (name: string) => `${name} ya no puede entrar a la app.`,
    emailSent: (email: string) => `Enviamos a ${email} el enlace para elegir su contraseña.`,
    created: (name: string, email: string) =>
      `Creamos la cuenta de ${name}. Le enviamos a ${email} un enlace para elegir su contraseña.`,
    form: {
      title: 'Nuevo usuario',
      intro:
        'La persona recibirá un correo con un enlace para elegir su contraseña. Si no le llega, revisa su carpeta de correo no deseado o reenvíalo desde la lista.',
      role: 'Rol',
      submit: 'Crear usuario',
      submitting: 'Creando usuario…',
      cancel: 'Cancelar',
      back: 'Volver a usuarios',
    },
  },
};

type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends readonly string[]
    ? readonly string[]
    : T extends string
      ? string
      : { readonly [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof es>;

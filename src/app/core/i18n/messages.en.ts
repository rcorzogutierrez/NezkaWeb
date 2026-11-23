import type { Messages } from './messages.es';

/** English texts. The `Messages` type makes the compiler flag any missing translation. */
export const en: Messages = {
  app: {
    name: 'Elpidio Jr. Produce',
    company: 'Elpidio Jr. Produce Co.',
    tagline: 'Wholesale Fresh Fruits, Vegetables & Groceries',
    address: '5400 NW 32nd Ct · Miami, FL',
    skipToContent: 'Skip to content',
  },
  language: {
    label: 'Language',
    es: 'Español',
    en: 'English',
  },
  auth: {
    statement: 'Clients, products and estimates in one place.',
    pitch:
      'The Elpidio Jr. Produce Co. office, now in the browser: the same data from the office, the warehouse or your phone.',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    confirmPassword: 'Repeat the password',
    passwordHint: (min) => `At least ${min} characters.`,
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    login: {
      title: 'Sign in',
      intro: 'Use your email and password.',
      forgot: 'Forgot your password?',
      submit: 'Sign in',
      submitting: 'Signing in…',
      noAccount: 'No account? Ask your administrator for one.',
      firstRun: 'This is the first time the app is used.',
      firstRunLink: 'Create the administrator account',
    },
    reset: {
      title: 'Reset your password',
      intro: 'We will email you a link to choose a new password.',
      submit: 'Send link',
      submitting: 'Sending…',
      sent: (email) =>
        `If ${email} has an account, the link is on its way. Check your spam folder too.`,
      back: 'Back to sign in',
    },
    setup: {
      title: 'First administrator account',
      intro: 'This account will create everyone else’s accounts. It is set up only once.',
      submit: 'Create administrator account',
      submitting: 'Creating account…',
      haveAccount: 'Already have an account?',
      loginLink: 'Sign in',
    },
    noAccess: {
      title: 'Your account has no access',
      body: (email) =>
        `You signed in as ${email}, but an administrator has not given you access yet or has turned it off. Ask them to check your account under Users.`,
      logout: 'Sign out',
    },
  },
  validation: {
    required: 'This field is required.',
    email: 'That email address is not valid.',
    minLength: (min) => `Use at least ${min} characters.`,
    mismatch: 'The passwords do not match.',
  },
  errors: {
    invalidCredentials: 'The email or password is not correct.',
    invalidEmail: 'That email address is not valid.',
    userDisabled: 'This account is disabled. Ask your administrator to turn it on.',
    emailInUse: 'There is already an account with that email.',
    weakPassword: 'That password is too weak. Use at least 8 characters.',
    tooManyRequests: 'Too many attempts in a row. Wait a few minutes or reset your password.',
    network: 'Cannot reach the server. Check your internet connection and try again.',
    notEnabled: 'Email and password sign-in is not turned on in Firebase.',
    permissionDenied: 'You do not have permission to do this.',
    unknown: 'Something went wrong. Please try again.',
  },
  nav: {
    sections: 'Sections',
    admin: 'Administration',
    clients: 'Clients',
    products: 'Products',
    estimates: 'Estimates',
    catalog: 'Catalog',
    users: 'Users',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    logout: 'Sign out',
  },
  upcoming: {
    heading: 'Coming in a future release',
    intro:
      'This section still lives in the desktop app. Once it moves to the web you will be able to:',
    clients: {
      summary: 'Create and maintain the clients you send estimates and invoices to.',
      features: [
        'Create clients with contact, email, phones, address and Tax ID.',
        'Edit, mark as inactive or delete existing ones.',
        'Search by name, contact, email, phone, city or Tax ID.',
        'Import the client list exported from QuickBooks.',
      ],
    },
    products: {
      summary: 'The product catalog with photo, UPC, size, pack and price per case.',
      features: [
        'See the catalog products with their photo and reference.',
        'Add, edit, deactivate or delete products.',
        'Find products that are missing a UPC or other data.',
      ],
    },
    estimates: {
      summary: 'Estimates per client, numbered PF-year-number, with their totals.',
      features: [
        'Create estimates by searching the catalog.',
        'Edit cases and price per case with live totals.',
        'Preview, print and save the PDF in the estimate layout.',
      ],
    },
    catalog: {
      summary: 'The product list you hand to clients, with or without prices.',
      features: [
        'Choose which products go into the catalog.',
        'Show or hide the price per case.',
        'Print the catalog or save it as PDF.',
      ],
    },
  },
  users: {
    title: 'Users',
    intro: 'The people who can sign in to the app. Only administrators see this section.',
    new: 'New user',
    caption: 'App users',
    colName: 'Name',
    colRole: 'Role',
    colStatus: 'Status',
    colActions: 'Actions',
    you: 'You',
    roleOf: (name) => `Role of ${name}`,
    ownRole: 'You cannot change your own role',
    active: 'Active',
    inactive: 'Inactive',
    activate: 'Activate',
    deactivate: 'Deactivate',
    resend: 'Resend email',
    loading: 'Loading users…',
    loadFailed: 'The user list could not be loaded. Check your connection and reload the page.',
    count: (total, inactive) =>
      `${total} ${total === 1 ? 'user' : 'users'}` + (inactive ? ` · ${inactive} inactive` : ''),
    roles: { admin: 'Administrator', user: 'User' },
    roleHelp: {
      user: 'Works with clients, products, estimates and the catalog.',
      admin: 'Also creates users and manages their access.',
    },
    roleChanged: (name, role) =>
      `${name} is now ${role === 'Administrator' ? 'an' : 'a'} ${role.toLowerCase()}.`,
    activated: (name) => `${name} has access again.`,
    deactivated: (name) => `${name} can no longer sign in.`,
    emailSent: (email) => `We emailed ${email} the link to choose a password.`,
    created: (name, email) =>
      `${name}’s account is ready. We emailed ${email} a link to choose a password.`,
    form: {
      title: 'New user',
      intro:
        'They will get an email with a link to choose their password. If it does not arrive, check their spam folder or resend it from the list.',
      role: 'Role',
      submit: 'Create user',
      submitting: 'Creating user…',
      cancel: 'Cancel',
      back: 'Back to users',
    },
  },
};

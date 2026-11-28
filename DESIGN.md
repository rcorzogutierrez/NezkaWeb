# Design

The desktop app's identity, carried to the web: the proforma letterhead on a calm, light office tool.

## World

- **Mode:** Operate. A working back-office tool; familiarity beats expression.
- **Light theme:** used in a daytime office and on a phone at the warehouse.
- **Signature move:** the proforma letterhead rule, a blue band over a thin red band (`.brand-rule`, 8px), across the top of every screen.
- **Shell:** white sidebar holding the logo (it has a white background, so it always sits on white), canvas-grey work area. Active section is a solid brand-blue pill with white text.
- **Sign-in:** split screen. Left (desktop only): white plate with logo, one plain statement, address and the fruit mascots. Right: brand-blue field (`brand-700`) with a white card holding the form. On phones only the blue field and the card remain, with the logo inside the card.

## Tokens (`src/styles.css`, Tailwind v4 `@theme`)

| Token                    | Value                 | Use                                        |
| ------------------------ | --------------------- | ------------------------------------------ |
| `brand-600`              | `#1e3f9e`             | Primary actions, active nav, focus, links  |
| `brand-700`              | `#183384`             | Hover, sign-in field                       |
| `brand-50/100/200`       | `#eef2fb` …           | Tints, selection, link underline           |
| `accent-600`             | `#d7191f`             | Letterhead rule only (red is not a button) |
| `ink` / `ink-muted`      | `#1b2133` / `#545c73` | Text (muted passes 4.5:1 on white/canvas)  |
| `line` / `line-strong`   | `#e2e6ee` / `#c9cfdb` | Dividers / input borders                   |
| `canvas`                 | `#f3f5f9`             | App background                             |
| `danger-*` / `success-*` |                       | Form errors and confirmations              |
| `shadow-panel`           |                       | The sign-in card only                      |

## Type

Figtree Variable, self-hosted via `@fontsource-variable/figtree`, one family for everything. Fixed rem scale: page title 1.75rem bold, card title 1.5rem bold, body 0.9375rem, labels 0.875rem semibold. Tight tracking only on headings.

## Components (shared classes in `styles.css`)

- `.btn-primary`: 44px tall, brand-600, 8px radius; disabled shows progress cursor with spinner and verb ("Entrando…").
- `.btn-icon`: 40px square ghost button for icon actions; always has `aria-label`.
- `.link`: brand-blue with a soft underline that darkens on hover.
- `.nav-link`: 44px rows with an 18px Lucide icon.
- `app-text-field`: label above, 44px input, error replaces hint below, password fields get a show/hide toggle.
- `.btn-secondary` / `.btn-ghost`: outlined and text buttons. `.btn-danger` (solid red) only inside a delete confirmation; `.btn-danger-ghost` opens it.
- `app-status-badge`: green Active / grey Inactive pill in lists.
- Lists: white panel, toolbar with search and a segmented filter that shows counts, blue table header (from the proforma), rows turn into stacked cards below `lg`. Skeleton rows while loading; empty states say what to do next. No stat cards.
- Long forms (`.form-section`): one white panel, sections divided by lines, the section title beside the fields on wide screens; actions and form-level messages in a grey footer bar.
- Home (`/`, after sign-in): greeting with the date and quick actions; one summary band of four linked figures (the year's quoted total in brand blue, like the proforma's TOTAL); recent estimates under the blue proforma header; "needs attention" rows linking to filtered lists; top clients of the year with thin brand bars; newest products with photos; an administration panel for admins only. This band is the only place figures are grouped; lists keep "no stat cards".
- Confirmations use a native `<dialog>` (focus trapped, Escape closes), only for destructive actions. The one other dialog is the inactivity warning (`app-idle-logout`): one minute before the 15-minute sign-out, a countdown with "Stay signed in" (primary, focused) and "Sign out"; Escape counts as staying.
- `app-form-alert`: tinted block with icon for form-level errors (`role=alert`) and confirmations (`role=status`).

## Icons

Lucide (`@lucide/angular`), stroke 2, 16–20px, decorative icons `aria-hidden`.

## Motion

Short colour transitions (150ms), drawer slide (200ms ease-out), router view transitions. All reduced under `prefers-reduced-motion`.

## Browser surfaces

Selection in brand tint, brand caret, 2px brand focus ring with offset, thin neutral scrollbars.

## Touch

On touch screens (`pointer-coarse:`) every control is at least 44px tall, row checkboxes are 24px inside a 44px label, and text fields use 16px type so iOS Safari does not zoom on focus.

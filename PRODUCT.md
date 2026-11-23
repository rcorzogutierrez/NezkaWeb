# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Angular 22 (standalone, zoneless, signals, Signal Forms), Firebase through the plain modular JS SDK (Auth with email and password, Firestore, Hosting; no AngularFire), Tailwind CSS v4, `@lucide/angular` icons. Tests with Vitest, ESLint (angular-eslint), Prettier. Chosen by Rafa.

## Users

Office staff of Elpidio Jr. Produce Co., a wholesale fruit, vegetable and grocery distributor in Miami (5400 NW 32nd Ct). They keep the customer list, the product catalog and send proformas (estimates) to customers such as Tree Logistics. Inferred, not confirmed: a handful of users, working mostly from an office desktop, sometimes from a phone at the warehouse.

## Product Purpose

Move the nezka-invoice desktop app (Python/PySide6 + SQLite, one PC) to the web so the same data is reachable from any device. Success: everything the desktop app does (clients, products, estimates with PDF, catalog, QuickBooks import) works in the browser on shared data.

## Operating Context

- The proforma PDF (PF-año-NNNN series) is the document customers receive; its letterhead (logo, blue band over a red one, blue table header) defines the brand.
- Customers come from QuickBooks Desktop exports (.xlsm/.csv/IIF).
- Product catalog: ~55 products with photo, UPC, size, pack, cases per pallet and price per case.

## Capabilities and Constraints

- Sign-in: email and password only, with password reset. No Google sign-in.
- UI languages: Spanish (default) and English, switchable anywhere; routes in English. Only administrators add people; there is no public sign-up.
- Roles: administrator (also manages users) and user. Accounts are deactivated, never deleted.
- Clients: every active user creates and edits them; only administrators delete.

## Brand Commitments

- Logo "Elpidio Jr. Produce Co. · Wholesale Fresh Fruits, Vegetables & Groceries" (`public/brand/logo.webp`, white background).
- Colors from the proforma: blue `#1e3f9e`, red `#d7191f`.
- Fruit and vegetable mascots illustration (`public/brand/frutas.webp`, white background).
- Rafa asked for a modern, professional adaptation of the desktop look, not a new identity.

## Evidence on Hand

Desktop app screenshots and README in rcorzogutierrez/nezka-invoice (`docs/`). No testimonials, metrics or customer claims exist; do not invent them.

## Product Principles

1. Same truth as the desktop app: features migrate as they work there, then improve.
2. Familiar office tool first; the brand lives in the details.
3. Every message in plain Spanish (or English) that says what happened and what to do.

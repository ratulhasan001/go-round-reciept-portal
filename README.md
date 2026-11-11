# Go Round · Web

An online store and a receipt and customer-ledger app for **Go Round**, an aquarium supply shop in Bangladesh. Make a professional A4 payment receipt in under a minute, then download it as a **PDF** or **Excel** file, print it, or send it on WhatsApp. The app also tracks who still owes money, keeps your price list and customers, runs a coupon sheet, and lets customers type in their own details from a one-time link.

**Live:**

| Address | What it is |
|---|---|
| https://goroundbd.com | The customer store |
| https://admin.goroundbd.com | The admin panel (receipts, orders, products, staff…), behind the shop password |
| https://verify.goroundbd.com | Check a purchase or order status with the payment's transaction ID (and download the receipt), or verify a staff member; staff QR codes open here |

All three are served by this one Next.js app: `src/proxy.ts` routes each address to its pages. Any other address (localhost, the `*.vercel.app` one) serves everything on one address: the admin panel at `/`, the store at `/store` and the verify page at `/store/verify`.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, `@react-pdf/renderer`, ExcelJS and Postgres (Neon). The app is mobile-first and can be installed to the home screen.

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Deploying to Vercel](#deploying-to-vercel)
- [Using the app](#using-the-app)
- [Importing spreadsheets](#importing-spreadsheets)
- [How totals are calculated](#how-totals-are-calculated)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Security](#security)
- [Customising](#customising)
- [Troubleshooting](#troubleshooting)

---

## Features

### Customer website (goroundbd.com)
- A public online store in the style of the Go Round visiting card (Aquascape Editorial): cream paper, Fraunces serif, swaying aquatic grass, line-drawn fish and gentle scroll motion. It is built for phones first.
- **Pages:** Home (featured products, categories and the interactive aquarium in guest mode), Shop (search, category chips, sort, in-stock filter), product pages, Cart, Checkout, Order status, About us, Contact us, FAQ and My account.
- **Ordering:** as a guest or with an account (an account can also be created at checkout). Checkout starts with the **customer form** (name, WhatsApp number, address), which also saves the customer to the Customers list. Payment is **bKash** or **bank transfer**, checked by hand: the customer pays the total shown and types the transaction ID at checkout. The ID is optional only for a bank transfer when no bank details are set, since the customer has to ask for them first. Prices, stock and delivery are always worked out on the server.
- **Approval, then receipt:** the order waits as *Waiting for approval* until the shop approves the payment. The order page checks for the approval every 30 seconds. Once approved, the customer gets **Download receipt**, the same A4 PDF the shop prints, stamped PAID. If the shop marks the payment *not found*, the customer is asked to check the transaction ID and send it again.
- **Order status** (`/order-status`, no account needed): the customer types the **transaction ID** of their bKash or bank payment to see the order's progress (placed → approved → shipped → delivered), payment status and courier info, and to download the receipt. Before paying, they can use the order code (e.g. `GR7K3F9Q`) plus their WhatsApp number instead. The old `/store/track` link redirects here.
- **Accounts:** log in with phone number and password. Customers see their orders and edit their details. A forgotten password is reset by the shop from Customers → Website accounts.
- A floating WhatsApp button, plus Facebook and WhatsApp links throughout. Products without a photo get a drawn aquascape placeholder.

### Admin panel (admin.goroundbd.com)
- Same look as the store: cream paper, ink green, teal accents and Fraunces headings.
- **Orders:** to approve / to ship / shipped / delivered / cancelled tabs with a badge for unseen orders. Open an order and check the bKash TrxID. **Approve payment** marks it paid, moves the order to *Approved*, and makes the receipt the customer downloads from the website. **Payment not found** asks the customer to resend the ID, and **Undo** takes an approval back. From there: one button for each next step, courier info, a private note, and a ready-made WhatsApp update for the customer. New orders appear within a minute.
- **Website:** taking-orders switch, announcement bar, WhatsApp and Facebook links, bKash number and type, bank details, delivery areas and fees, free-delivery threshold, About us text and FAQ.
- **Products:** *Photos & details* on each product: photos (resized in the browser), description, category, *Show on website* and *Feature on home page*.
- **Visit store** button in the navbar and on the home page.

### Employees
- Staff records: name, phone, role, joining date, monthly salary, notes and an active / former switch, with the active headcount and monthly salary total at the top.
- Every new employee automatically gets a private random code and a **verification QR code**. Download the QR on its own, or a printable **ID card** (card size, in the visiting card's style).
- Scanning the QR opens `verify.goroundbd.com/<code>`: **Verified staff** with their name, role and start month, **No longer with us** once they're marked as former, or **Not verified** for an unknown code. Phone, salary and notes are never shown.

### Receipts
- **Live A4 preview** that matches the downloaded PDF. On a phone, you switch between Edit and Preview.
- **PDF export**: A4 portrait with the Bricolage Grotesque and Manrope fonts embedded, the shop logo, an optional faint logo watermark, and the signature. The layout tightens step by step until the receipt fits on one page, and only very long receipts run onto a second page.
- **Automatic PAID / DUE stamp**: a "PAID" stamp with the date of the last payment, or a "DUE" stamp with the balance still owed.
- **Excel export**: an A4 portrait workbook, fit to page width, with the logo and live formulas for amounts, totals, paid and balance due. It uses Arial so it prints the same on any computer.
- **Amount in words** using the Bangladeshi lakh / crore system ("Taka Five Thousand Seven Hundred Only").
- **Autofill**: a saved customer fills in their phone and address, and a saved product fills in its price. New customers and products are remembered when the receipt is saved.
- **Quick-add chips** for your best-selling products.
- **Discounts**: a percentage, a fixed BDT amount, or free delivery, with 5% / 10% / 15% shortcuts.
- **Coupons**: use a code from the coupon sheet on this receipt, or give one as a gift for the customer's next visit. A gift prints a "Special Reward for You!" note on the receipt.
- **Additional charges** (optional for each receipt): a payment-channel percentage (for example bKash 2%), a courier percentage (Pathao, Steadfast or a custom courier with a percentage plus a fixed fee), and any manual charges.
- **Payments**: Cash, bKash, Bank Transfer and Card, each with a date and a note. "Mark fully paid" fills in the rest. Payments can be flagged as **advance** (paid before delivery), so the courier percentage is charged only on what the courier still has to collect.
- **Status** (Paid / Partial / Unpaid) is worked out from the payments.
- **Auto-save** while editing an existing receipt. **Ctrl/⌘ + S** saves and **Ctrl/⌘ + P** prints. You are warned before leaving a new receipt you haven't saved.
- **Duplicate** any receipt as a starting point for a new one.

### Sharing
- **WhatsApp**: on a phone, share the PDF itself through the system share menu (WhatsApp, Messenger, Gmail and so on). On a computer, open WhatsApp with a ready-made receipt summary.
- **Payment reminders**: the "Who owes you" list (largest balance first) has a one-tap WhatsApp reminder for each customer.

### Lists
- **Receipts**: totals billed, collected and outstanding, a list you can search and filter, and a **ledger export** that puts every receipt in one Excel sheet with totals.
- **Products**: your price list, with an in-stock / out-of-stock switch and best-sellers.
- **Customers**: contacts with their number of receipts, total spent and amount still owed. You can copy a customer's details or import customers from Excel / CSV.
- **Coupons**: your coupon sheet, showing who has each code, its validity dates, and when and on which receipt it was used. You can import the sheet from Excel / CSV.
- Every list has search (press `/` to jump to it), filter tabs, sorting and inline editing that saves instantly.

### Customer form links
- Make a **one-time link** (valid for 30 minutes) and send it to a customer. They open it without logging in and type in their name, WhatsApp number and address, which go straight into your customer list.
- If the phone number is already saved, that customer is updated instead of being added twice. Bangladeshi numbers match in any format (`+880 17…`, `017-…`).
- A live countdown, a status for each link (active, used, expired or cancelled), and a cancel button.

### Home and app shell
- A dashboard with this month's billed and collected amounts, the total still due, and the receipt count, plus a calendar and flip clock.
- An interactive **aquarium** on the home page, with fish, games, weather, seasonal visitors and a treasure chest that bubbles up with today's sales. Guests on the customer form see a version without any shop data.
- Number keys **1–6** jump straight to a section. Pages slide between sections with view transitions.
- Mobile layout: a bottom navigation bar, a thumb-friendly action bar, and "Add to Home Screen" support through the PWA manifest.
- **Backup / restore** to a JSON file, and a reset to sample data, in Settings.

---

## How it works

The app runs in one of two modes, depending on whether a database is configured:

| Mode | When | Where data lives |
|---|---|---|
| **Cloud** | `DATABASE_URL` is set | Postgres, shared across every device. The browser keeps a copy and a queue of unsent changes, so the app keeps working offline and syncs when the connection is back. |
| **Local** | No `DATABASE_URL` | Only in this browser's `localStorage`. The sidebar shows "Saved on this device". Customer form links are unavailable. |

- **PDFs and Excel files are never stored.** They are generated in the browser when you ask for them.
- All shop data (settings, products, customers, coupons, receipts) is stored as JSON documents in one table, `gr_docs(kind, id, data)`. Customer form links live in `gr_forms`, which keeps only a SHA-256 hash of each link's token. Both tables are **created automatically** on first use, so there are no migrations to run.
- Changes are sent in batches to `/api/sync`. When the app comes back into view, it pulls the latest data so you see changes made on other devices or through a customer form.
- **First login on a device that already has receipts in its browser** moves them into the database automatically. Log in first on the device that has your existing receipts.

---

## Getting started

**Requirements:** Node.js 20.9 or newer, and npm.

```bash
npm install
npm run dev       # http://localhost:3000
```

Without a `.env` file the app runs in **local mode**: no login, sample data, everything saved in the browser. That is enough to try the receipt editor, PDF / Excel export and the lists.

To test cloud mode and customer form links locally, create `.env.local`:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/goround   # any Postgres; SSL is turned off for localhost
APP_PASSWORD=choose-a-password                              # optional, switches on the login screen
```

**Tip:** local-mode data is tied to the address in the browser (`localStorage` is per origin). To try things out without touching your usual data, run on a spare port, for example `npx next dev -p 3123`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js config) |

---

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables (or in `.env.local` for development). Both are optional.

| Variable | What it does |
|---|---|
| `DATABASE_URL` | Postgres connection string. It is added automatically when you connect a Neon database in Vercel. Neon's pooled (pgbouncer) URL works. Without it the app runs in local mode. |
| `APP_PASSWORD` | Shop password. When set, every page asks for it on a "Confidential" login screen, and a device stays logged in for a year. **Changing it logs every device out.** |

---

## Deploying to Vercel

**Option A: GitHub (recommended)**
1. Push this folder to a GitHub repository.
2. On vercel.com, choose **Add New… → Project** and import the repository.
3. Keep the defaults (Framework: Next.js) and click **Deploy**.
4. Optional: under **Storage**, connect a Neon Postgres database (this sets `DATABASE_URL`), add `APP_PASSWORD`, then redeploy.

**Option B: Vercel CLI**
```bash
npx vercel          # first time: log in and link the project
npx vercel --prod   # deploy to production
```

The app deploys and works without any environment variables, saving to each browser only. Add a database to share data across devices and to use customer form links.

---

## Using the app

1. **Settings first.** Enter the shop name, tagline, contact details and logo, the invoice prefix and next number, the default delivery charge, the thank-you and terms text, the watermark setting, and the additional-charge rates.
2. **New receipt.** Pick or type a customer, add items (or tap a quick-add chip), and set delivery, discount, coupon and charges. Record payments, then **Save**, **PDF**, **Excel**, **Print** or **Share**.
3. **Receipts.** See who owes you, send reminders, edit, duplicate or delete receipts, and export the ledger.
4. **Customer form.** From Customers, create a one-time link and send it to the customer. They fill it in, and their details appear in your list (refreshed automatically).
5. **Coupons.** Import your coupon sheet or add codes by hand. When a receipt uses a code or gives it as a gift, the sheet is updated automatically, and released again if the receipt changes or is deleted.

Receipt numbers run on from **Next number** in Settings (for example `GR-0001`). Deleting the newest receipt frees its number for the next one.

---

## Importing spreadsheets

Customers and coupons can be imported from `.xlsx` or `.csv` files (comma, semicolon or tab separated). The import dialog shows a preview of what will be added, updated or skipped before anything changes, and offers a sample file to download.

**Customers.** Columns are found by their headings: a name column (required) plus phone / mobile / contact and address / location / area. A matching phone number, or a matching name when neither row has a phone, counts as the same customer. A match only fills in a missing phone or address.

**Coupons.** Columns: `Code`, `Name`, `Phone Number`, `Validity`, `Using Date`. The offer comes from the code's letter ending, read from the legend in the Code heading:

```
Code (a-1%)(b-2%)(c-3%)(d-4%)(e-5%)(fd-free delivery),Name,Phone Number,Validity,Using Date
GR41-87-44-79a,Monowarul Islam,01746980757,21-04-26 to 21-06-26,
GR43-29-44-17fd,,,,
```

Dates such as `21-04-26`, `21/04/2026` and `2026-04-21` are all understood. A code that is already saved only gets its missing details filled in.

A coupon can't be used if it was already used on another receipt, has expired, isn't valid yet, or was given to a different customer. A gift coupon with no end date in the sheet is valid for two months from the receipt date.

---

## How totals are calculated

All maths lives in `src/lib/calc.ts` (amounts are rounded to 2 decimals):

```
subtotal       = Σ price × qty
discount       = subtotal × discount% + fixed discount (+ delivery, if "free delivery")
coupon         = (subtotal − item discount) × coupon% + coupon amount (+ delivery, if free delivery and not already waived)
base           = subtotal + delivery − discount − coupon
charges        = payment-channel % of subtotal
               + courier % of (subtotal − advance payments) [+ fixed fee for "Other"]
               + manual charges
grand total    = base + charges
balance due    = grand total − Σ payments
```

A coupon given as a gift takes nothing off the current receipt. Charge rates are copied into the receipt when chosen, so changing a rate in Settings never changes old receipts.

---

## Project structure

```
src/
├── proxy.ts                    # Login gate for every page and API route (Next 16 "proxy", formerly middleware)
├── app/
│   ├── page.tsx                # Home dashboard + aquarium
│   ├── new/                    # Receipt editor (?id=… edits, ?copy=… duplicates)
│   ├── receipts/ products/ customers/ coupons/ settings/
│   ├── login/                  # Password screen
│   ├── f/[token]/              # Public one-time customer form
│   ├── manifest.ts             # PWA manifest
│   └── api/
│       ├── data/               # GET all shop data
│       ├── sync/               # POST batched upserts / deletes
│       ├── forms/              # Create, check, list and cancel customer form links
│       ├── f/[token]/          # Public form submission
│       ├── shop-logo/          # Public logo for the customer form
│       └── login/ logout/
├── components/
│   ├── Editor.tsx              # Receipt form, live summary and actions
│   ├── ReceiptPreview.tsx      # On-screen A4 preview
│   ├── ListEditor.tsx          # Shared list UI for products, customers and coupons
│   ├── CustomerFormDialog.tsx  # Make and track customer form links
│   ├── CustomerFormView.tsx    # The page customers fill in
│   ├── ImportDialog.tsx        # Excel / CSV import with preview
│   ├── AppShell.tsx, nav.tsx   # Navigation, sync status
│   └── aquarium/               # Interactive tank: engine, art, scenery, sound
└── lib/
    ├── types.ts                # Data model
    ├── store.tsx               # Client store: localStorage copy, outbox, sync, coupon linking
    ├── calc.ts                 # Totals, charges, formatting, amount in words
    ├── pdf.tsx                 # PDF receipt (@react-pdf/renderer)
    ├── excel.ts                # Excel receipt (ExcelJS)
    ├── ledger.ts               # All-receipts Excel export
    ├── seal.ts, watermark.ts   # PAID / DUE stamp, signature, logo watermark
    ├── coupons.ts              # Coupon rules and coupon-sheet import
    ├── customerImport.ts       # Customer import
    ├── sheet.ts                # CSV / XLSX reader
    ├── phone.ts                # Bangladeshi phone normalising
    ├── download.ts             # File download and share helpers
    ├── theme.ts                # Receipt colours and logo
    ├── seed.ts                 # Default shop settings and sample data
    └── server/                 # auth, db, forms, logo (server-only)
public/
├── fonts/                      # TTF fonts embedded in the PDF
├── logo.png, sign.png          # Default logo and signature
└── icon-192.png, icon-512.png  # App icons
```

---

## API reference

Every route needs the shop session cookie, except where marked **public**. When `APP_PASSWORD` isn't set, every request counts as logged in.

| Method & path | Purpose |
|---|---|
| `POST /api/login` | **Public.** `{ password }` → sets the `gr_session` cookie. Wrong passwords are slowed down. |
| `POST /api/logout` | Clears the session cookie. |
| `GET /api/data` | `{ db, auth, shop, products, customers, coupons, invoices }`, or `{ db: false }` in local mode. |
| `POST /api/sync` | `{ changes: [{ kind, id, data \| null }] }`. Up to 5000 upserts / deletes in one transaction. `kind` is one of `shop`, `product`, `customer`, `invoice`, `coupon`, `letter`, `order`, `employee`. |
| `POST /api/forms` | Creates a customer form link → `{ token, expiresAt }`. |
| `GET /api/forms?token=…` | Link status: `active`, `used` (with the customer's name), `expired` or `missing`. |
| `GET /api/forms?list=1` | The 25 most recent links. |
| `DELETE /api/forms?token=…` or `?id=…` | Cancels a link that hasn't been used. |
| `POST /api/f/[token]` | **Public.** `{ name, phone, address }`. Claims the link and saves the customer in one transaction. Returns `422` with field errors or `410` once the link is used or expired. |
| `GET /api/shop-logo` | **Public.** The shop logo image (raster only), cached by version. |
| `POST /api/site/orders` | **Public.** Places a website order (`name, phone, address, email?, note?, zone, method, trxId?, sender?, password?, items: [{id, qty}]`). |
| `POST /api/site/track` | **Public.** `{ trxId }` (6+ characters; case, spaces and dashes ignored) or `{ code, phone }` → the order (without the shop's private note). |
| `POST /api/site/pay` | **Public.** `{ code, phone, method, trxId, sender? }` adds payment details to an unpaid order. |
| `GET/POST /api/site/account` | **Public.** The logged-in customer and their orders; `action`: `register`, `login`, `logout`, `update`, `password`. |
| `GET /api/site/products` | **Public.** Current prices and stock for the cart. |
| `POST /api/site/receipt` | **Public.** `{ code, phone }` → the receipt and the shop details it prints, once the payment is approved (`409` before). |
| `GET /api/img/[id]` | **Public.** A product photo (`-t` on the end = thumbnail). |
| `POST/DELETE /api/images` | Upload (`full` + `thumb` form fields) or remove a product photo. |
| `GET/POST /api/accounts` | List website accounts; `{ id, action: "reset" \| "delete" }`. |

---

## Security

- **Login:** `src/proxy.ts` sends every page to `/login` (and returns `401` for API routes) until the password is entered. The session cookie is an HMAC derived from `APP_PASSWORD`. It is `httpOnly`, `sameSite=lax`, and `secure` in production, and is compared in constant time.
- **Customer form links** are random 18-byte tokens. Only their SHA-256 hash is stored, they expire after 30 minutes (timed by the database clock), and each can be used once. Old links are cleaned up after a day.
- The public form only ever sees the shop name, tagline and logo. It never sees customers, receipts or prices.
- The customer website (`/store`, `/api/site/…`, `/api/img/…`) is public. It only ever sees shop name, contact details, website settings and products marked *Show on website*. Customer passwords are hashed with scrypt and live in `gr_accounts`, never in `gr_docs`, so they never reach the admin browser. Login tokens are stored hashed in `gr_sessions`.
- Only PNG / JPEG / WebP / GIF logos are served from the app's own domain (an SVG could carry script).
- Logging out removes the shop data from that browser, unless changes are still waiting to sync.

---

## Customising

| What | Where |
|---|---|
| Shop name, tagline, contact details, logo, watermark, invoice prefix, next number, delivery charge, footer text, charge rates | **Settings** page |
| Receipt colours, default logo | `src/lib/theme.ts` |
| Website colours and fonts | `src/app/globals.css` |
| Receipt layout | `src/lib/pdf.tsx` (PDF), `src/components/ReceiptPreview.tsx` (preview), `src/lib/excel.ts` (Excel) |
| Signature image | `public/sign.png` |
| Payment methods and couriers | `src/lib/types.ts` (`PAYMENT_METHODS`, `COURIERS`) |
| Default settings and sample data | `src/lib/seed.ts` |
| Coupon code legend | `DEFAULT_LEGEND` in `src/lib/coupons.ts` |
| Customer form link lifetime | `FORM_TTL_MINUTES` in `src/lib/server/forms.ts` |

> **Note for contributors:** this project uses Next.js 16, which renames and changes several APIs (for example `middleware.ts` → `proxy.ts`, and typed `PageProps` / `RouteContext`). Check the guides in `node_modules/next/dist/docs/` before changing framework code. See `AGENTS.md`.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| Sidebar says "Saved on this device" on the live site | `DATABASE_URL` is missing or the database can't be reached. Check the Vercel environment variables and redeploy. |
| "Offline · will sync when back online" | Changes are queued in the browser and are sent automatically when the connection returns. Don't clear the browser data until it shows "Synced". |
| Customer form button doesn't work | Customer form links need a database (cloud mode). |
| Customers can open the form link on Wi-Fi but not on mobile data | Some mobile carriers have trouble reaching `*.vercel.app` addresses. Add a custom domain to the Vercel project and open the app from that domain, because form links use the address the app is opened from. |
| Everyone got logged out | `APP_PASSWORD` was changed. Log in again with the new password. |
| Old receipts missing after first login | Log in on the device that had them. They are moved into the database on that device's first login. |

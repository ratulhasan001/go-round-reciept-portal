# Go Round · Receipt Studio

Create professional A4 payment receipts in under a minute, then download them as a **PDF** or an **Excel** file, print them, or send them on WhatsApp.

## Features

- **Live A4 preview** that matches the downloaded PDF.
- **PDF** (A4 portrait, Bricolage Grotesque + Manrope fonts embedded, your logo, multi-page with a repeating table header and page numbers).
- **Excel** (A4 portrait, fit to page width, logo, live formulas for amounts, totals, paid and balance due).
- **Autofill:** saved customers fill in their phone and address, and saved products fill in their price. New customers and products are remembered automatically.
- **Quick-add chips** for your best-selling products (tap twice to make the quantity 2).
- **Payments:** Cash, bKash, Nagad, Rocket, Bank, Card. "Mark fully paid" fills in the remaining amount. Status (Paid / Partial / Unpaid) is calculated automatically.
- **Discount shortcuts** (5%, 10%, 15% of the subtotal).
- **WhatsApp:** send the receipt summary to the customer, or on a phone, share the PDF itself into WhatsApp.
- **Who owes you:** a dashboard list of unpaid balances, each with a one-tap WhatsApp reminder.
- **Ledger export:** every receipt in a single Excel sheet with totals.
- **Auto-save** while editing, with keyboard shortcuts **Ctrl/⌘ + S** (save) and **Ctrl/⌘ + P** (print).
- **Mobile-first:** a bottom navigation bar, a thumb-friendly action bar, and "Add to Home Screen" support (PWA manifest).
- **Backup / restore** to a JSON file (Settings).

## Database & login (Vercel)

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | What it does |
|---|---|
| `DATABASE_URL` | Postgres connection (added automatically when you connect a Neon database). Customers, products, receipts and settings are saved here and shared across devices. PDFs / Excel files are never stored — they are generated on demand. |
| `APP_PASSWORD` | Shop password. When set, every page asks for it on a “Confidential” login screen. Changing it logs every device out. |

- The table (`gr_docs`) is created automatically on first use.
- The first time you log in on a device that already has receipts in its browser, they are moved into the database automatically. **Log in first on the device that has your existing receipts.**
- Without `DATABASE_URL` the app still works, saving to the browser only (the sidebar shows “Saved on this device”).

## Run locally

```bash
npm install
npm run dev       # http://localhost:3000
```

## Deploy to Vercel

**Option A: GitHub (recommended)**
1. Push this folder to a new GitHub repository.
2. Go to vercel.com → **Add New… → Project** → import the repository.
3. Keep the defaults (Framework: Next.js) and click **Deploy**.

**Option B: Vercel CLI**
```bash
npx vercel          # first time: log in and link the project
npx vercel --prod   # deploy to production
```

No environment variables or database are needed.

## Customising

- Shop name, tagline, contact details, logo, invoice prefix, next number, delivery charge and footer text: **Settings** page.
- Colours: `src/lib/theme.ts` (receipt) and `src/app/globals.css` (website).
- Receipt layout: `src/lib/pdf.tsx` (PDF), `src/components/ReceiptPreview.tsx` (preview), `src/lib/excel.ts` (Excel).

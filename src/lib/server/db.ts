import postgres from "postgres";

/**
 * Everything (shop settings, products, customers, coupons, receipts, letters, website orders) is stored as JSON
 * documents in one table: gr_docs(kind, id, data). PDFs / Excel files are never
 * stored - they are generated in the browser on demand. Product photos live in gr_images, and the customer
 * website's accounts in gr_accounts / gr_sessions (kept out of gr_docs so password hashes never reach a browser).
 */
export const KINDS = ["shop", "product", "customer", "invoice", "coupon", "letter", "order", "employee"] as const;
export type Kind = (typeof KINDS)[number];

export const dbEnabled = () => !!process.env.DATABASE_URL;

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __grSql?: Sql; __grSchema?: Promise<unknown> };

export function db(): Sql {
  if (!g.__grSql) {
    const url = process.env.DATABASE_URL!;
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    g.__grSql = postgres(url, {
      ssl: local ? false : "require",
      max: 3,
      prepare: false, // required for Neon's pooled (pgbouncer) connection string
      idle_timeout: 20,
    });
  }
  return g.__grSql;
}

export function ensureSchema() {
  g.__grSchema ??= db()`
    create table if not exists gr_docs (
      kind text not null,
      id text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (kind, id)
    )`
    // one row per customer-form link; only a hash of the link's token is kept
    .then(
      () => db()`
        create table if not exists gr_forms (
          token_hash text primary key,
          created_at timestamptz not null default now(),
          expires_at timestamptz not null,
          used_at timestamptz,
          customer_name text
        )`,
    )
    .then(() => db()`alter table gr_forms add column if not exists cancelled_at timestamptz`)
    // product photos, uploaded from the admin panel
    .then(
      () => db()`
        create table if not exists gr_images (
          id text primary key,
          mime text not null,
          bytes bytea not null,
          created_at timestamptz not null default now()
        )`,
    )
    // customer accounts on the website; phone_key = digits of the normalised phone number
    .then(
      () => db()`
        create table if not exists gr_accounts (
          id text primary key,
          phone_key text not null unique,
          phone text not null,
          name text not null,
          email text not null default '',
          address text not null default '',
          pass_hash text not null,
          created_at timestamptz not null default now()
        )`,
    )
    // only a hash of each login token is kept
    .then(
      () => db()`
        create table if not exists gr_sessions (
          token_hash text primary key,
          account_id text not null references gr_accounts(id) on delete cascade,
          expires_at timestamptz not null
        )`,
    )
    .catch((e) => {
      g.__grSchema = undefined; // retry on the next request
      throw e;
    });
  return g.__grSchema;
}

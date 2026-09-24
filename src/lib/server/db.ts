import postgres from "postgres";

/**
 * Everything (shop settings, products, customers, receipts) is stored as JSON
 * documents in one table: gr_docs(kind, id, data). PDFs / Excel files are never
 * stored - they are generated in the browser on demand.
 */
export const KINDS = ["shop", "product", "customer", "invoice"] as const;
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
    )`.catch((e) => {
    g.__grSchema = undefined; // retry on the next request
    throw e;
  });
  return g.__grSchema;
}

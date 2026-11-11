import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { phoneKey } from "@/lib/phone";

type Tx = postgres.TransactionSql | postgres.Sql;

/**
 * Adds a customer to the shop's customer list, or updates the saved one with the same phone number. Saved phones may be
 * in any shape (+880 17…, 017-…), so Bangladeshi numbers match on their last 10 digits. Returns the customer's id.
 */
export async function upsertCustomer(tx: Tx, c: { name: string; phone: string; address: string }) {
  const digits = phoneKey(c.phone);
  const [match] = await tx<{ id: string; data: Record<string, unknown> }[]>`
    with c as (select id, data, updated_at, regexp_replace(coalesce(data->>'phone', ''), '\\D', '', 'g') as d from gr_docs where kind = 'customer')
    select id, data from c
    where d = ${digits} or (length(${digits}) = 11 and ${digits} like '01%' and length(d) >= 10 and right(d, 10) = right(${digits}, 10))
    order by updated_at desc limit 1`;
  const id = match?.id ?? randomUUID();
  const customer = { ...(match?.data ?? {}), id, name: c.name, phone: c.phone, address: c.address, updatedAt: Date.now() };
  await tx`
    insert into gr_docs (kind, id, data) values ('customer', ${id}, ${tx.json(customer)})
    on conflict (kind, id) do update set data = excluded.data, updated_at = now()`;
  return id;
}

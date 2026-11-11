import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { phoneKey } from "@/lib/phone";

type Tx = postgres.TransactionSql | postgres.Sql;

/** Contact details as the customer list and the website accounts both keep them. */
export interface Contact {
  name: string;
  phone: string;
  address: string;
  email?: string;
}

/**
 * The saved customer with this phone number. Saved phones may be in any shape (+880 17…, 017-…), so Bangladeshi
 * numbers match on their last 10 digits.
 */
export async function findCustomer(tx: Tx, phone: string) {
  const digits = phoneKey(phone);
  if (digits.length < 6) return null;
  const [match] = await tx<{ id: string; data: Record<string, unknown> }[]>`
    with c as (select id, data, updated_at, regexp_replace(coalesce(data->>'phone', ''), '\\D', '', 'g') as d from gr_docs where kind = 'customer')
    select id, data from c
    where d = ${digits} or (length(${digits}) = 11 and ${digits} like '01%' and length(d) >= 10 and right(d, 10) = right(${digits}, 10))
    order by updated_at desc limit 1`;
  return match ?? null;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Adds a customer to the shop's customer list, or updates the saved one with the same phone number. A blank address
 * or email never wipes out a saved one. Returns the customer's id.
 */
export async function upsertCustomer(tx: Tx, c: Contact) {
  const match = await findCustomer(tx, c.phone);
  const id = match?.id ?? randomUUID();
  const old = match?.data ?? {};
  const email = text(c.email) || text(old.email);
  const customer = {
    ...old,
    id,
    name: c.name || text(old.name),
    phone: c.phone,
    address: c.address.trim() || text(old.address),
    ...(email ? { email } : {}),
    updatedAt: Date.now(),
  };
  await tx`
    insert into gr_docs (kind, id, data) values ('customer', ${id}, ${tx.json(customer)})
    on conflict (kind, id) do update set data = excluded.data, updated_at = now()`;
  return id;
}

/**
 * Copies contact details onto the website account with the same phone number (if there is one), so the customer
 * list and the account always show the same name, address and email. Blank values never wipe out saved ones.
 * `onlyAccount` limits it to one account (a logged-in customer updating their own details).
 */
export async function syncAccount(tx: Tx, c: Contact, onlyAccount?: string) {
  const digits = phoneKey(c.phone);
  if (digits.length < 10) return;
  const name = c.name.trim();
  const address = c.address.trim();
  const email = text(c.email);
  await tx`
    update gr_accounts set
      name = case when ${name} <> '' then ${name} else name end,
      address = case when ${address} <> '' then ${address} else address end,
      email = case when ${email} <> '' then ${email} else email end
    where right(phone_key, 10) = right(${digits}, 10) ${onlyAccount ? tx`and id = ${onlyAccount}` : tx``}`;
}

/** Saves the details to the customer list and to the matching website account in one go. */
export async function saveContact(tx: Tx, c: Contact) {
  await upsertCustomer(tx, c);
  await syncAccount(tx, c);
}

/**
 * What the website may fill in for someone typing this number: the saved details of a customer without an account.
 * Numbers with an account only say so - their details stay behind the password.
 */
export async function lookupContact(tx: Tx, phone: string): Promise<{ account: true } | ({ account: false } & Omit<Contact, "phone">) | null> {
  const digits = phoneKey(phone);
  if (!/^01\d{9}$/.test(digits)) return null;
  const [acc] = await tx`select 1 from gr_accounts where right(phone_key, 10) = right(${digits}, 10)`;
  if (acc) return { account: true };
  const match = await findCustomer(tx, digits);
  if (!match) return null;
  const d = match.data;
  const name = text(d.name);
  if (!name) return null;
  return { account: false, name, address: text(d.address), email: text(d.email) };
}

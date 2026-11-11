import { randomBytes, randomUUID } from "node:crypto";
import { clean, normPhone, phoneKey } from "@/lib/phone";
import { cleanCode, deliveryFee, makeOrderCode, needsTrxAtCheckout, onSite, siteSettings, thumb } from "@/lib/site";
import { ORDER_PAY_METHODS, type Invoice, type Order, type OrderItem, type OrderPayMethod, type Product } from "@/lib/types";
import { db } from "./db";
import { loadShop } from "./catalog";
import { upsertCustomer } from "./customers";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type Fields = Record<string, string>;

/** Name, phone and address as typed at checkout / on an account, cleaned and checked. */
export function readContact(body: Record<string, unknown>) {
  const name = clean(body.name).slice(0, 80);
  const phone = normPhone(clean(body.phone).slice(0, 30));
  const email = clean(body.email).slice(0, 120);
  const address = String(body.address ?? "").trim().replace(/[ \t]+/g, " ").slice(0, 400);
  const errors: Fields = {};
  if (name.length < 2) errors.name = "Please enter your full name.";
  const digits = phoneKey(phone);
  if (!/^01\d{9}$/.test(phone) && (digits.length < 8 || digits.length > 15)) errors.phone = "Please enter a valid WhatsApp number.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "That email doesn't look right.";
  return { name, phone, email, address, errors };
}

export function readPayment(body: Record<string, unknown>) {
  const method = ORDER_PAY_METHODS.includes(body.method as OrderPayMethod) ? (body.method as OrderPayMethod) : null;
  const trxId = clean(body.trxId).toUpperCase().slice(0, 40);
  const sender = clean(body.sender).slice(0, 60);
  return { method, trxId, sender };
}

export class OrderError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(String(body.error));
  }
}

/**
 * Places a website order. Prices, stock and delivery come from the database, never from the browser.
 * The customer is also added to (or updated in) the shop's customer list.
 */
export async function placeOrder(body: Record<string, unknown>, accountId: string | null): Promise<Order> {
  const { name, phone, email, address, errors } = readContact(body);
  if (address.length < 5) errors.address = "Please enter your full delivery address.";
  const { method, trxId, sender } = readPayment(body);
  if (!method) errors.method = "Please choose how you will pay.";
  const shop = await loadShop();
  const settings = siteSettings(shop);
  // payments are checked by hand, so the order needs the transaction id to approve it (unless the customer has to ask for our bank details first)
  if (method && !trxId && needsTrxAtCheckout(settings, method)) errors.trxId = "Please pay first, then type the transaction ID here.";
  if (Object.keys(errors).length) throw new OrderError(422, { error: "invalid", fields: errors });

  const raw = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  const wanted = new Map<string, number>();
  for (const it of raw as { id?: unknown; qty?: unknown }[]) {
    const id = typeof it?.id === "string" ? it.id.slice(0, 100) : "";
    const qty = Math.floor(Number(it?.qty));
    if (id && qty > 0) wanted.set(id, Math.min(99, (wanted.get(id) ?? 0) + qty));
  }
  if (!wanted.size) throw new OrderError(422, { error: "empty", message: "Your cart is empty." });

  if (!settings.open) throw new OrderError(409, { error: "closed", message: "We're not taking orders on the website right now. Please message us on WhatsApp." });

  const rows = await db()<{ data: Product }[]>`select data from gr_docs where kind = 'product' and id = any(${[...wanted.keys()]})`;
  const byId = new Map(rows.map((r) => [r.data.id, r.data]));
  const items: OrderItem[] = [];
  const unavailable: string[] = [];
  for (const [id, qty] of wanted) {
    const p = byId.get(id);
    if (!p || !onSite(p) || p.inStock === false) {
      unavailable.push(id);
      continue;
    }
    items.push({ productId: id, name: p.name.trim(), unit: p.unit?.trim() || undefined, price: p.price, qty, image: p.images?.[0] ? thumb(p.images[0]) : undefined });
  }
  if (unavailable.length)
    throw new OrderError(409, { error: "unavailable", ids: unavailable, message: "Some items in your cart are no longer available. We've removed them - please check your cart." });

  const subtotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
  const { zone, fee } = deliveryFee(settings, String(body.zone ?? ""), subtotal);
  const now = Date.now();
  const order: Order = {
    id: randomUUID(),
    code: "",
    status: "placed",
    history: [{ status: "placed", at: now }],
    customer: { name, phone, address, ...(email ? { email } : {}) },
    ...(accountId ? { accountId } : {}),
    items,
    subtotal,
    delivery: fee,
    zone,
    total: round2(subtotal + fee),
    payment: { method: method!, ...(trxId ? { trxId, submittedAt: now } : {}), ...(sender ? { sender } : {}) },
    ...(clean(body.note) ? { note: String(body.note).trim().slice(0, 500) } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await db().begin(async (tx) => {
    // a fresh code (the alphabet has ~887 million six-letter codes, so a clash is rare)
    for (let i = 0; i < 5 && !order.code; i++) {
      const code = makeOrderCode((n) => randomBytes(n));
      const [taken] = await tx`select 1 from gr_docs where kind = 'order' and data->>'code' = ${code}`;
      if (!taken) order.code = code;
    }
    await tx`insert into gr_docs (kind, id, data) values ('order', ${order.id}, ${tx.json(order as never)})`;
    await upsertCustomer(tx, { name, phone, address });
  });
  return order;
}

/** The order with this code, if the phone number matches the one it was placed with. */
export async function findOrder(code: string, phone: string): Promise<Order | null> {
  const c = cleanCode(code);
  const digits = phoneKey(phone);
  if (c.length < 6 || c.length > 12 || digits.length < 6) return null;
  const [row] = await db()<{ data: Order }[]>`select data from gr_docs where kind = 'order' and data->>'code' = ${c}`;
  if (!row) return null;
  const saved = phoneKey(row.data.customer.phone);
  const same = saved === digits || (saved.length >= 10 && digits.length >= 10 && saved.slice(-10) === digits.slice(-10));
  return same ? row.data : null;
}

/**
 * Every order placed with this mobile number, newest first. Numbers are compared on their last 10 digits, so
 * 01712-345678, +8801712345678 and 8801712345678 are the same number.
 */
export async function findOrdersByPhone(phone: string): Promise<Order[]> {
  const digits = phoneKey(phone);
  if (digits.length < 10 || digits.length > 15) return [];
  const rows = await db()<{ data: Order }[]>`
    select data from gr_docs
    where kind = 'order' and right(regexp_replace(coalesce(data->'customer'->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${digits.slice(-10)}
    order by (data->>'createdAt')::bigint desc limit 20`;
  return rows.map((r) => r.data);
}

/** Transaction ids as typed: upper case, no spaces or dashes. */
export const trxKey = (s: string) => s.toUpperCase().replace(/[\s-]/g, "");

/**
 * The newest order paid with this transaction id (bKash TrxID or bank reference). Knowing it means you made the
 * payment, so it is enough to open the order - but very short ids are refused, as they could be guessed.
 */
export async function findOrderByTrx(trxId: string): Promise<Order | null> {
  const key = trxKey(trxId);
  if (key.length < 6 || key.length > 40) return null;
  const [row] = await db()<{ data: Order }[]>`
    select data from gr_docs
    where kind = 'order' and upper(regexp_replace(coalesce(data->'payment'->>'trxId', ''), '[[:space:]-]', '', 'g')) = ${key}
    order by (data->>'createdAt')::bigint desc limit 1`;
  return row?.data ?? null;
}

/** What the customer sees of an order: everything except the shop's private note. */
export const orderView = (o: Order) => {
  const { adminNote, seen, invoiceId, ...rest } = o;
  void adminNote;
  void seen;
  void invoiceId;
  return rest;
};
export type OrderView = ReturnType<typeof orderView>;

/** Saves payment details the customer adds after ordering (only while the shop hasn't verified a payment). */
export async function addPayment(order: Order, body: Record<string, unknown>) {
  const { method, trxId, sender } = readPayment(body);
  if (!trxId) throw new OrderError(422, { error: "invalid", fields: { trxId: "Please enter the transaction ID." } });
  if (order.status === "cancelled" || order.payment.verified) throw new OrderError(409, { error: "locked", message: "This order's payment can't be changed any more." });
  const next: Order = {
    ...order,
    payment: { ...order.payment, method: method ?? order.payment.method, trxId, ...(sender ? { sender } : {}), submittedAt: Date.now() },
    seen: false,
    updatedAt: Date.now(),
  };
  await db()`update gr_docs set data = ${db().json(next as never)}, updated_at = now() where kind = 'order' and id = ${order.id}`;
  return next;
}

/** Orders placed from a customer account, newest first. */
export async function accountOrders(accountId: string) {
  const rows = await db()<{ data: Order }[]>`
    select data from gr_docs where kind = 'order' and data->>'accountId' = ${accountId} order by (data->>'createdAt')::bigint desc limit 100`;
  return rows.map((r) => orderView(r.data));
}

/**
 * The admin panel saves whole order documents. If the customer added payment details after the admin's copy was
 * loaded, keep the customer's newer details instead of overwriting them.
 */
export function mergeOrder(server: Order | undefined, incoming: Order): Order {
  if (!server) return incoming;
  const s = server.payment;
  const i = incoming.payment;
  if ((s?.submittedAt ?? 0) > (i?.submittedAt ?? 0))
    // the admin's copy (and any "payment not found" it carries) is about the details the customer has since replaced
    return {
      ...incoming,
      payment: { ...i, method: s.method, trxId: s.trxId, sender: s.sender, submittedAt: s.submittedAt, rejectedAt: s.rejectedAt },
      seen: incoming.seen && server.seen,
    };
  return incoming;
}

/** The receipt the shop made for an approved order, with the shop details it prints (null until approved). */
export async function orderReceipt(order: Order) {
  if (!order.payment.verified || !order.invoiceId) return null;
  const [inv] = await db()<{ data: Invoice }[]>`select data from gr_docs where kind = 'invoice' and id = ${order.invoiceId}`;
  if (!inv) return null;
  const shop = await loadShop();
  const { name, tagline, address, phone, email, website, logo, thankYou, terms, watermark } = shop;
  return { invoice: inv.data, shop: { name, tagline, address, phone, email, website, logo, thankYou, terms, watermark } };
}

export const newId = () => randomUUID();

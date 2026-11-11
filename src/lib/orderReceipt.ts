import { todayISO, uid } from "./calc";
import type { Invoice, Order } from "./types";

/**
 * A receipt for a website order: its customer, items and delivery, plus the payment once the shop has approved it
 * (recorded as an advance, since it was paid before delivery).
 */
export function invoiceFromOrder(order: Order, number: string): Invoice {
  const now = Date.now();
  return {
    id: uid(),
    number,
    date: todayISO(),
    customer: { name: order.customer.name, phone: order.customer.phone, address: order.customer.address },
    items: order.items.map((i) => ({ id: uid(), description: i.name, price: i.price, qty: i.qty })),
    delivery: order.delivery,
    discount: 0,
    payments: order.payment.verified
      ? [{ id: uid(), date: todayISO(), method: order.payment.method, amount: order.total, note: order.payment.trxId ? `TrxID ${order.payment.trxId}` : "", advance: true }]
      : [],
    notes: `Website order ${order.code}`,
    orderId: order.id,
    createdAt: now,
    updatedAt: now,
  };
}

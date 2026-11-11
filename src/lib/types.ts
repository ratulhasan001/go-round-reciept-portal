export type PaymentMethod = "Cash" | "bKash" | "Bank Transfer" | "Card";

export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "bKash", "Bank Transfer", "Card"];

export type Courier = "None" | "Pathao" | "Steadfast" | "Other";
export const COURIERS: Courier[] = ["None", "Pathao", "Steadfast", "Other"];

/** Percentage charges per payment channel / courier (editable in Settings). */
export interface ChargeRates {
  pay: Record<PaymentMethod, number>;
  courier: Record<Courier, number>;
}

export interface ManualCharge {
  id: string;
  label: string;
  amount: number;
}

/** Optional extra charges on a receipt. Rates are copied in when chosen, so old receipts never change. */
export interface Extras {
  enabled: boolean;
  payVia: PaymentMethod;
  payRate: number;
  courier: Courier;
  courierRate: number;
  courierName?: string; // for "Other"
  courierFixed?: number; // fixed BDT, for "Other"
  manual: ManualCharge[];
}

export interface Coupon {
  code: string;
  pct: number; // % of (subtotal - discount)
  amount: number; // fixed BDT
  freeDelivery?: boolean;
  validTo?: string; // yyyy-mm-dd, from the coupon sheet; printed in the reward note
  gift?: boolean; // given for the customer's next visit: nothing comes off this receipt (missing = used on it)
}

export interface ChargeLine {
  label: string;
  amount: number;
  rate?: number; // percent, when the charge is a percentage
  fixed?: number; // fixed BDT added on top of the percentage
  on?: number; // the amount the percentage is taken on, when it isn't the full product total (after an advance)
}

export interface Shop {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  invoicePrefix: string;
  nextNumber: number;
  defaultDelivery: number;
  thankYou: string;
  terms: string;
  logo: string; // data URL (png/jpg) or ""
  watermark: boolean; // faint logo behind the receipt
  rates: ChargeRates;
  site?: SiteSettings; // the customer website (missing on shops saved before the website existed)
}

// ---------- customer website ----------

export interface DeliveryZone {
  id: string;
  name: string; // e.g. "Inside Dhaka"
  fee: number; // BDT
}

export interface Faq {
  q: string;
  a: string;
}

/** Settings for the public store, edited on the admin "Website" page. */
export interface SiteSettings {
  open: boolean; // taking orders on the website
  announcement: string; // thin bar above the store header ("" = none)
  whatsapp: string; // WhatsApp number customers message
  facebook: string; // Facebook page link
  bkash: { number: string; type: "Personal" | "Merchant" | "Agent" };
  bank: { bank: string; accountName: string; accountNumber: string; branch: string; routing: string };
  zones: DeliveryZone[];
  freeDeliveryOver: number; // order subtotal from which delivery is free (0 = never)
  address: string; // where the shop is, as the website shows it
  deliveryNote: string; // how orders reach customers, shown on product pages and Contact us
  about: string; // About us page text (blank lines start a new paragraph)
  faq: Faq[];
}

export type OrderStatus = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type OrderPayMethod = "bKash" | "Bank Transfer";
export const ORDER_PAY_METHODS: OrderPayMethod[] = ["bKash", "Bank Transfer"];

export interface OrderItem {
  productId: string;
  name: string;
  unit?: string;
  price: number;
  qty: number;
  image?: string;
}

/** An order placed on the customer website. Stored like everything else (kind "order"). */
export interface Order {
  id: string;
  code: string; // what the customer tracks it with, e.g. GR7K3F9Q
  status: OrderStatus;
  history: { status: OrderStatus; at: number }[];
  customer: { name: string; phone: string; email?: string; address: string };
  accountId?: string; // placed while logged in to a customer account
  items: OrderItem[];
  subtotal: number;
  delivery: number;
  zone: string; // delivery zone name
  total: number;
  payment: {
    method: OrderPayMethod;
    trxId?: string; // bKash transaction id / bank reference the customer typed
    sender?: string; // bKash number or account name it was paid from
    submittedAt?: number; // when the customer gave the payment details
    verified?: boolean; // the shop has checked the money arrived
    verifiedAt?: number;
    rejectedAt?: number; // the shop couldn't find this payment; a newer submittedAt means the customer sent it again
  };
  note?: string; // from the customer
  adminNote?: string; // private, only in the admin panel
  tracking?: string; // courier / tracking info shown to the customer
  invoiceId?: string; // receipt made from this order
  invoiceNumber?: string;
  seen?: boolean; // opened in the admin panel
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit?: string; // what the price is for, e.g. "pcs", "bottle", "pack"; missing on older saved products
  inStock?: boolean; // missing (older saved products) means in stock
  updatedAt?: number; // ms timestamp of the last edit; missing on older saved products
  // customer website (all optional, so older saved products keep working)
  images?: string[]; // photo addresses (/api/img/<id>, or data URLs when there is no database); none = placeholder
  description?: string;
  category?: string;
  subcategory?: string; // within the category, e.g. Filter › Filter media
  onSite?: boolean; // missing means shown on the website
  featured?: boolean; // shown on the store's home page
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string; // from the website (checkout or account)
  updatedAt?: number; // ms timestamp of the last change; missing on older saved customers
}

/** A staff record. Only kept for the shop's reference - an employee can't log in. */
export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string; // e.g. Packing, Delivery, Sales
  joined: string; // yyyy-mm-dd, "" = not set
  salary: number; // monthly, BDT
  notes: string;
  active?: boolean; // missing means still working here
  code: string; // random, unguessable: the address of their public verification page (what their QR code opens)
  updatedAt?: number;
}

/** A coupon from the coupon sheet. The offer comes from the code's ending (a = 1% … e = 5%, fd = free delivery). */
export interface CouponCode {
  id: string;
  code: string; // e.g. GR41-87-44-79a
  pct: number; // percent off (0 for free delivery)
  freeDelivery: boolean;
  name: string; // customer it was given to ("" = not given yet)
  phone: string;
  validFrom: string; // yyyy-mm-dd, "" = no start
  validTo: string; // yyyy-mm-dd, "" = never expires
  usedOn: string; // yyyy-mm-dd, "" = not used yet
  usedInvoice?: string; // receipt number it was used on (for display)
  usedInvoiceId?: string; // id of that receipt; missing on coupons marked used before ids were kept
  givenInvoice?: string; // receipt number it was given away on as a gift (for display)
  givenInvoiceId?: string; // id of that receipt
  updatedAt?: number;
}

export interface LineItem {
  id: string;
  description: string;
  price: number;
  qty: number;
}

export interface Payment {
  id: string;
  date: string; // yyyy-mm-dd
  method: PaymentMethod;
  amount: number;
  note: string;
  advance?: boolean; // paid before delivery: the courier % is charged only on the product amount still to collect
}

export interface Invoice {
  id: string;
  number: string;
  date: string; // yyyy-mm-dd
  customer: { name: string; phone: string; address: string };
  items: LineItem[];
  delivery: number;
  discount: number; // fixed BDT discount
  discountPct?: number; // % of subtotal
  discountFreeDelivery?: boolean;
  coupon?: Coupon;
  extras?: Extras;
  payments: Payment[];
  notes: string;
  orderId?: string; // the website order this receipt was made from
  createdAt: number;
  updatedAt: number;
}

export type Status = "PAID" | "PARTIAL" | "UNPAID";

export interface Totals {
  subtotal: number;
  discountTotal: number;
  discountLabel: string;
  couponTotal: number;
  couponLabel: string;
  base: number; // subtotal + delivery - discount - coupon (before additional charges)
  charges: ChargeLine[];
  chargesTotal: number;
  grandTotal: number;
  paid: number;
  due: number;
  status: Status;
  lastPayment: string | null;
}

/** A letter written on the shop letterhead. Every text field may be left empty. */
export interface Letter {
  id: string;
  ref: string; // GR-0001, GR-0002… (filled in automatically)
  date: string; // yyyy-mm-dd, "" = no date printed
  to: string; // recipient, one line per row
  subject: string;
  body: string; // HTML from the formatting editor (read with parseRich)
  signed: boolean; // CEO signature and company seal under the letter
  createdAt?: number;
  updatedAt?: number;
}

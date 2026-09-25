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
}

export interface ChargeLine {
  label: string;
  amount: number;
  rate?: number; // percent, when the charge is a percentage
  fixed?: number; // fixed BDT added on top of the percentage
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
}

export interface Product {
  id: string;
  name: string;
  price: number;
  inStock?: boolean; // missing (older saved products) means in stock
  updatedAt?: number; // ms timestamp of the last edit; missing on older saved products
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
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

import type { Customer, Invoice, Product, Shop } from "./types";

export const DEFAULT_SHOP: Shop = {
  name: "Go Round",
  tagline: "Aquarium & Aquascaping Supplies",
  address: "Khulna / Dhaka, Bangladesh",
  phone: "+880 1309-372143",
  email: "",
  website: "",
  invoicePrefix: "GR-",
  nextNumber: 2,
  defaultDelivery: 150,
  thankYou: "Thank you for shopping with Go Round!",
  terms: "Please keep this receipt for your records. Goods once sold are subject to our return policy.",
  logo: "/logo.png",
  watermark: true,
  rates: {
    pay: { Cash: 0, bKash: 2, "Bank Transfer": 0, Card: 0 },
    courier: { None: 0, Pathao: 0, Steadfast: 1, Other: 0 },
  },
};

export const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Seachem Prime 325ml", price: 2350, inStock: true },
  { id: "p2", name: "APT Complete (3) 500ml", price: 3200, inStock: true },
];

export const SEED_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Amit Biswas", phone: "01743876195", address: "Miapara More, Khulna, Bangladesh" },
];

export const SEED_INVOICES: Invoice[] = [
  {
    id: "i1",
    number: "GR-0001",
    date: "2026-08-03",
    customer: { name: "Amit Biswas", phone: "01743876195", address: "Miapara More, Khulna, Bangladesh" },
    items: [
      { id: "l1", description: "Seachem Prime 325ml", price: 2350, qty: 1 },
      { id: "l2", description: "APT Complete (3) 500ml", price: 3200, qty: 1 },
    ],
    delivery: 150,
    discount: 200,
    payments: [
      { id: "y1", date: "2026-08-03", method: "Cash", amount: 150, note: "Up-down rent" },
      { id: "y2", date: "2026-09-18", method: "bKash", amount: 2500, note: "" },
    ],
    notes: "Delivery charge includes 150 tk up-down rent.",
    createdAt: Date.UTC(2026, 7, 3),
    updatedAt: Date.UTC(2026, 8, 18),
  },
];

"use client";

import { useEffect, useRef, useState } from "react";
import { phoneKey } from "@/lib/phone";

export type SavedContact =
  | { phone: string; account: true }
  | { phone: string; account: false; name: string; address: string; email: string };

/**
 * Looks up the details saved for a full Bangladeshi mobile number (01XXXXXXXXX in any common shape) once the
 * customer has finished typing it. Gives the details of a customer without an account, `{ account: true }` for a
 * number with an account, or null. `onFound` runs once per number looked up, with what was found.
 */
export function useSavedContact(phone: string, enabled: boolean, onFound?: (c: SavedContact) => void) {
  const key = phoneKey(phone);
  const ready = enabled && /^01\d{9}$/.test(key);
  const [found, setFound] = useState<SavedContact | null>(null);
  const cb = useRef(onFound);
  useEffect(() => {
    cb.current = onFound;
  });

  useEffect(() => {
    if (!ready) return;
    let live = true;
    const t = window.setTimeout(() => {
      fetch("/api/site/customer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: key }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          if (!live) return;
          const c: SavedContact | null = b && (b.account || b.name) ? { ...b, phone: key } : null;
          setFound(c);
          if (c) cb.current?.(c);
        })
        .catch(() => null);
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [ready, key]);

  // only the answer for the number that's typed in right now
  return ready && found?.phone === key ? found : null;
}

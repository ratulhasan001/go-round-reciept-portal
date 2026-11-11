import type { Metadata } from "next";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { loadCatalog } from "@/lib/server/catalog";
import { findStaff } from "@/lib/server/staff";
import { waLink } from "@/lib/site";
import { Grass } from "@/components/store/Art";
import { WhatsAppIcon } from "@/components/store/Icons";
import { btn } from "@/components/store/ui";

export const metadata: Metadata = { title: "Staff verification", robots: { index: false, follow: false } };

const since = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";
};

/** Public: what a staff member's QR code opens - whether this person works for the shop. */
export default async function VerifyStaffPage({ params }: PageProps<"/store/verify/[code]">) {
  const { code } = await params;
  const [{ shop }, staff] = await Promise.all([loadCatalog(), findStaff(decodeURIComponent(code).toLowerCase())]);
  const checked = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });

  const tone = !staff
    ? { ring: "ring-red-200", badge: "bg-red-100 text-red-700", icon: <ShieldX className="size-10" />, label: "Not verified" }
    : staff.active
      ? { ring: "ring-sea-sprout/60", badge: "bg-sea-sprout/25 text-sea-moss", icon: <BadgeCheck className="size-10" />, label: "Verified staff" }
      : { ring: "ring-amber-200", badge: "bg-amber-100 text-amber-800", icon: <ShieldAlert className="size-10" />, label: "No longer with us" };

  return (
    <div className="mx-auto max-w-md px-4 pt-10 sm:pt-16">
      <div className={`relative overflow-hidden rounded-[32px] bg-sea-paper p-7 pb-28 text-center shadow-[0_30px_60px_-34px_rgba(17,58,45,0.55)] ring-2 ${tone.ring}`}>
        <Grass blades={50} seed={13} height={120} className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" />
        <p className="store-eyebrow">{shop.name} · Staff verification</p>
        <div className={`mx-auto mt-6 grid size-20 place-items-center rounded-full ${tone.badge} sea-sheet-in`}>{tone.icon}</div>
        <p className={`mx-auto mt-4 inline-block rounded-full px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-[0.14em] ${tone.badge}`}>{tone.label}</p>

        {staff ? (
          <>
            <h1 className="mt-5 font-serif text-[38px] leading-tight">{staff.name}</h1>
            {staff.role && <p className="mt-1 font-serif text-[22px] italic text-sea-teal">{staff.role}</p>}
            <p className="mt-4 text-[15px] leading-relaxed text-sea-body">
              {staff.active ? (
                <>
                  This person works for <b>{shop.name}</b>
                  {since(staff.joined) && <> since {since(staff.joined)}</>}.
                </>
              ) : (
                <>
                  This person <b>no longer works for {shop.name}</b>. Please don&apos;t hand over payments or parcels - contact us instead.
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-serif text-[32px] leading-tight">We can&apos;t verify this code</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-sea-body">
              This QR code doesn&apos;t belong to anyone on the {shop.name} team. Please don&apos;t hand over payments or parcels - check with us first.
            </p>
          </>
        )}
        <p className="mt-6 text-[12px] font-semibold text-sea-muted">Checked {checked}</p>
      </div>

      <a href={waLink(shop.site.whatsapp, `Hi ${shop.name}! I'd like to confirm a staff member.`)} target="_blank" rel="noopener noreferrer" className={btn("outline", "lg", "mt-6 w-full")}>
        <WhatsAppIcon className="size-5 text-wa" /> Confirm with {shop.name} on WhatsApp
      </a>
    </div>
  );
}

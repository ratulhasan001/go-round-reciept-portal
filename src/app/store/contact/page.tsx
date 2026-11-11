import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { loadCatalog } from "@/lib/server/catalog";
import { prettyPhone, waLink } from "@/lib/site";
import { FacebookIcon, WhatsAppIcon } from "@/components/store/Icons";
import { Reveal } from "@/components/store/Reveal";
import { PageHead } from "@/components/store/ui";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const { shop } = await loadCatalog();
  const s = shop.site;
  const cards = [
    { href: waLink(s.whatsapp, `Hi ${shop.name}! `), icon: <WhatsAppIcon className="size-6 text-wa" />, t: "WhatsApp", d: prettyPhone(s.whatsapp), note: "Fastest way to reach us", ext: true },
    shop.phone && { href: `tel:${shop.phone.replace(/[^\d+]/g, "")}`, icon: <Phone className="size-6 text-sea-teal" />, t: "Call", d: shop.phone, note: "During the day" },
    s.facebook && { href: s.facebook, icon: <FacebookIcon className="size-6 text-[#1877F2]" />, t: "Facebook", d: "Follow us on Facebook", note: "News, new arrivals and tank photos", ext: true },
    shop.email && { href: `mailto:${shop.email}`, icon: <Mail className="size-6 text-sea-teal" />, t: "Email", d: shop.email, note: "We reply within a day" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; t: string; d: string; note: string; ext?: boolean }[];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <PageHead eyebrow="Contact us" title={<>Say <em>hello</em></>} intro="Questions about plants, an order, or what your tank needs? We're happy to help." />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <Reveal key={c.t} delay={i * 70}>
            <a
              href={c.href}
              {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex h-full items-center gap-4 rounded-[24px] border border-sea-line bg-sea-paper p-5 transition hover:-translate-y-0.5 hover:border-sea-ink/30 hover:shadow-[0_18px_40px_-28px_rgba(17,58,45,0.6)]"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white ring-1 ring-sea-line">{c.icon}</span>
              <span className="min-w-0">
                <span className="store-eyebrow block">{c.t}</span>
                <span className="mt-1 block truncate text-[17px] font-extrabold group-hover:text-sea-teal">{c.d}</span>
                <span className="block text-[13px] text-sea-muted">{c.note}</span>
              </span>
            </a>
          </Reveal>
        ))}
      </div>
      {shop.address && (
        <Reveal className="mt-4 flex items-start gap-4 rounded-[24px] border border-sea-line bg-sea-paper p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white ring-1 ring-sea-line">
            <MapPin className="size-6 text-sea-teal" />
          </span>
          <span>
            <span className="store-eyebrow block">Where we are</span>
            <span className="mt-1 block text-[17px] font-extrabold">{shop.address}</span>
            <span className="block text-[13px] text-sea-muted">We deliver all over Bangladesh.</span>
          </span>
        </Reveal>
      )}
    </div>
  );
}

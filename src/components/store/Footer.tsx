import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { prettyPhone, waLink, type Links, type PublicShop } from "@/lib/site";
import { Grass } from "./Art";
import { FacebookIcon, WhatsAppIcon } from "./Icons";

export function Footer({ shop, links }: { shop: PublicShop; links: Links }) {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-sea-line bg-sea-paper">
      <Grass blades={90} seed={21} height={110} still className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-60" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-32 pt-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            {shop.logo && (
              // eslint-disable-next-line @next/next/no-img-element -- shop logo
              <img src={shop.logo} alt="" className="size-11 rounded-full object-contain" />
            )}
            <span className="font-serif text-[26px] font-semibold">{shop.name}</span>
          </div>
          <p className="mt-4 max-w-xs font-serif text-[19px] leading-snug">
            Witness the <em className="text-sea-teal">Underwater World</em> Through Us
          </p>
          <p className="store-eyebrow mt-4 !tracking-[0.24em]">Importer &amp; supplier of aquarium plants &amp; accessories</p>
        </div>
        <div>
          <h2 className="store-eyebrow">Explore</h2>
          <ul className="mt-4 grid gap-2.5 text-[14.5px] font-semibold text-sea-body">
            {links.nav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-sea-teal">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={links.verify()} className="transition hover:text-sea-teal">
                Verify a purchase or staff member
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="store-eyebrow">Get in touch</h2>
          <ul className="mt-4 grid gap-3 text-[14.5px] font-semibold text-sea-body">
            <li>
              <a href={waLink(shop.site.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition hover:text-sea-teal">
                <WhatsAppIcon className="size-[18px] text-wa" /> {prettyPhone(shop.site.whatsapp)}
              </a>
            </li>
            {shop.phone && shop.phone !== shop.site.whatsapp && (
              <li>
                <a href={`tel:${shop.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2.5 transition hover:text-sea-teal">
                  <Phone className="size-[18px]" /> {shop.phone}
                </a>
              </li>
            )}
            {shop.email && (
              <li>
                <a href={`mailto:${shop.email}`} className="flex items-center gap-2.5 break-all transition hover:text-sea-teal">
                  <Mail className="size-[18px] shrink-0" /> {shop.email}
                </a>
              </li>
            )}
            {shop.site.facebook && (
              <li>
                <a href={shop.site.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition hover:text-sea-teal">
                  <FacebookIcon className="size-[18px] text-[#1877F2]" /> Follow us on Facebook
                </a>
              </li>
            )}
            {shop.site.address.trim() && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-[18px] shrink-0" /> {shop.site.address}
              </li>
            )}
          </ul>
          <p className="mt-5 text-[12.5px] text-sea-muted">We accept bKash and bank transfer.</p>
        </div>
      </div>
      <p className="relative pb-6 text-center text-[12px] font-semibold text-sea-ink/60">
        © {new Date().getFullYear()} {shop.name} · <Link href={links.store("/faq")} className="hover:text-sea-ink">Help</Link>
      </p>
    </footer>
  );
}

import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { loadCatalog } from "@/lib/server/catalog";
import { waLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/store/Icons";
import { Reveal } from "@/components/store/Reveal";
import { PageHead, btn } from "@/components/store/ui";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const { shop } = await loadCatalog();
  const faq = shop.site.faq.filter((f) => f.q.trim());
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-14">
      <PageHead eyebrow="FAQ" title={<>Good <em>questions</em></>} intro="Everything about ordering, paying and delivery." />
      <div className="divide-y divide-sea-line border-y border-sea-line">
        {faq.map((f, i) => (
          <Reveal key={i} delay={Math.min(i, 6) * 50}>
            <details className="group py-1" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16.5px] font-bold [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="size-5 shrink-0 text-sea-teal transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="whitespace-pre-line pb-5 pr-8 text-[15px] leading-relaxed text-sea-body">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-12 rounded-[28px] bg-sea-paper p-6 text-center ring-1 ring-sea-line">
        <p className="font-serif text-[24px]">Still wondering?</p>
        <p className="mt-1 text-[14.5px] text-sea-body">Ask us anything - we usually reply within a few hours.</p>
        <a href={waLink(shop.site.whatsapp, `Hi ${shop.name}! I have a question: `)} target="_blank" rel="noopener noreferrer" className={btn("primary", "lg", "mt-5")}>
          <WhatsAppIcon className="size-5 text-wa" /> Ask on WhatsApp
        </a>
      </Reveal>
    </div>
  );
}

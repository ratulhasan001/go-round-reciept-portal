import type { Metadata } from "next";
import Link from "next/link";
import { loadCatalog } from "@/lib/server/catalog";
import { storeLinks } from "@/lib/server/links";
import { Bubbles, Fish, Grass } from "@/components/store/Art";
import { Reveal } from "@/components/store/Reveal";
import { PageHead, btn } from "@/components/store/ui";

export const metadata: Metadata = { title: "About us" };

export default async function AboutPage() {
  const { shop } = await loadCatalog();
  const L = await storeLinks();
  const paras = shop.site.about.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="relative">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <PageHead eyebrow={`About ${shop.name}`} title={<>Witness the <em>Underwater World</em> Through Us</>} />
          <div className="grid gap-5 text-[16.5px] leading-[1.75] text-sea-body">
            {paras.map((p, i) => (
              <Reveal key={i} delay={i * 80}>
                <p className="whitespace-pre-line">{p}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 flex flex-wrap gap-3">
            <Link href={L.store("/products")} className={btn("primary", "lg")}>
              Visit the shop
            </Link>
            <Link href={L.store("/contact")} className={btn("outline", "lg")}>
              Contact us
            </Link>
          </Reveal>
        </div>
        <Reveal className="relative hidden lg:block">
          <div className="sticky top-28 aspect-[3/4] overflow-hidden rounded-[32px] bg-gradient-to-b from-sea-teal-soft to-sea-paper ring-1 ring-sea-line">
            {shop.logo && (
              // eslint-disable-next-line @next/next/no-img-element -- shop logo
              <img src={shop.logo} alt="" className="absolute left-8 top-8 size-20 rounded-full object-contain" />
            )}
            <Bubbles className="absolute right-12 top-20 h-36 w-20" />
            <Fish className="sea-bob absolute left-[30%] top-[42%] w-24" />
            <Grass blades={50} seed={9} height={220} className="absolute inset-x-0 bottom-0 h-1/2 w-full" />
          </div>
        </Reveal>
      </div>
    </div>
  );
}

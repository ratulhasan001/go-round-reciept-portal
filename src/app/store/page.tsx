import Link from "next/link";
import { ArrowRight, PackageCheck, ShoppingBag, Wallet } from "lucide-react";
import { loadCatalog } from "@/lib/server/catalog";
import { waLink } from "@/lib/site";
import { storeLinks } from "@/lib/server/links";
import { Bubbles, Fish, Grass, Rule } from "@/components/store/Art";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductImage } from "@/components/store/ProductImage";
import { Reveal } from "@/components/store/Reveal";
import { StoreTank } from "@/components/store/StoreTank";
import { WhatsAppIcon } from "@/components/store/Icons";
import { btn } from "@/components/store/ui";

export default async function StoreHome() {
  const { shop, products } = await loadCatalog();
  const L = await storeLinks();
  const inStock = products.filter((p) => p.inStock);
  const featured = [...products.filter((p) => p.featured && p.inStock), ...inStock.filter((p) => !p.featured)].slice(0, 8);
  const categories = [...new Map(products.filter((p) => p.category).map((p) => [p.category.toLowerCase(), p])).values()].slice(0, 6);
  const heroPics = products.filter((p) => p.images.length).slice(0, 3);

  return (
    <>
      {/* hero - the visiting card, opened up */}
      <section className="relative overflow-hidden">
        <Grass blades={110} seed={11} height={260} className="pointer-events-none absolute inset-x-0 bottom-0 h-[170px] w-full sm:h-[240px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[90px] h-0 sm:bottom-[130px]">
          <div className="sea-fish absolute left-0" style={{ "--dur": "38s", "--reach": "70vw" } as React.CSSProperties}>
            <Fish className="w-14 sm:w-20" />
          </div>
          <div className="sea-fish absolute left-0 top-10" style={{ "--dur": "52s", "--delay": "-20s", "--reach": "86vw" } as React.CSSProperties}>
            <Fish className="w-9 sm:w-12" width={3.4} />
          </div>
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-48 pt-12 sm:px-6 sm:pb-64 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="store-eyebrow animate-fade-up">Aquarium plants &amp; accessories · Bangladesh</p>
            <h1 className="mt-5 font-serif text-[46px] leading-[1.02] sm:text-[72px]">
              <span className="block animate-fade-up [animation-delay:60ms]">Witness the</span>
              <em className="block animate-fade-up text-sea-teal [animation-delay:140ms]">Underwater World</em>
              <span className="block animate-fade-up [animation-delay:220ms]">Through Us</span>
            </h1>
            <Rule className="mt-7 animate-fade-up [animation-delay:300ms]" />
            <p className="mt-6 max-w-md animate-fade-up text-[16px] leading-relaxed text-sea-body [animation-delay:340ms]">
              Plants, fertilisers and equipment for planted tanks - picked by hobbyists, packed by hand and delivered to your door.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:400ms]">
              <Link href={L.store("/products")} className={btn("primary", "lg")}>
                Shop now <ArrowRight className="size-4" />
              </Link>
              <a href={waLink(shop.site.whatsapp, `Hi ${shop.name}! I'd like to ask about `)} target="_blank" rel="noopener noreferrer" className={btn("outline", "lg")}>
                <WhatsAppIcon className="size-[18px] text-wa" /> Ask us
              </a>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <Bubbles className="sea-bob absolute -top-24 right-10 h-32 w-20" />
            {heroPics.length ? (
              <div className="relative h-[420px]">
                {heroPics.map((p, i) => (
                  <div
                    key={p.id}
                    className="sea-bob absolute hover:z-10"
                    style={{ width: ["62%", "46%", "40%"][i], left: ["4%", "52%", "36%"][i], top: ["6%", "0%", "52%"][i], animationDelay: `${-i * 1.6}s` }}
                  >
                    <Link
                      href={L.store(`/products/${encodeURIComponent(p.id)}`)}
                      className={`block aspect-square overflow-hidden rounded-[28px] shadow-[0_30px_60px_-30px_rgba(17,58,45,0.6)] ring-1 ring-sea-line transition-[rotate,scale] duration-500 hover:rotate-0 hover:scale-[1.03] ${["-rotate-4", "rotate-5", "-rotate-2"][i]}`}
                    >
                      <ProductImage src={p.images[0]} name={p.name} eager />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative mx-auto aspect-[4/5] w-[78%] rotate-2 overflow-hidden rounded-[32px] bg-sea-paper p-8 shadow-[0_30px_60px_-30px_rgba(17,58,45,0.6)] ring-1 ring-sea-line">
                {shop.logo && (
                  // eslint-disable-next-line @next/next/no-img-element -- shop logo
                  <img src={shop.logo} alt="" className="size-16 rounded-full object-contain" />
                )}
                <p className="mt-6 font-serif text-[30px] leading-tight">
                  Aquarium <em className="text-sea-teal">plants</em>
                  <br />
                  &amp; accessories
                </p>
                <p className="store-eyebrow mt-4 !text-[9.5px]">Importer &amp; supplier</p>
                <Grass blades={40} seed={5} height={160} className="absolute inset-x-0 bottom-0 h-[45%] w-full" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-20 grid gap-3 sm:-mt-28 sm:grid-cols-3">
          {[
            { icon: ShoppingBag, t: "Pick your product", d: "Add what you need to the cart - no account needed." },
            { icon: Wallet, t: "Pay by bKash or bank", d: "Send the total and type in the transaction ID." },
            { icon: PackageCheck, t: "We pack & deliver", d: "Check Order status any time with your mobile number." },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 90} className="relative rounded-[24px] border border-sea-line bg-sea-paper/95 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-sea-teal-soft text-sea-teal">
                  <s.icon className="size-5" />
                </span>
                <span className="font-serif text-[15px] italic text-sea-muted">Step {i + 1}</span>
              </div>
              <h2 className="mt-3 text-[16px] font-extrabold">{s.t}</h2>
              <p className="mt-1 text-[14px] leading-relaxed text-sea-body">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* featured products */}
      {featured.length > 0 && (
        <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="store-eyebrow">From the shop</p>
              <h2 className="mt-3 font-serif text-[34px] leading-tight sm:text-[44px]">
                Hand-picked for <em className="text-sea-teal">your tank</em>
              </h2>
            </div>
            <Link href={L.store("/products")} className={btn("outline", "md")}>
              See everything <ArrowRight className="size-4" />
            </Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* categories */}
      {categories.length > 1 && (
        <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="store-eyebrow">Browse</p>
            <h2 className="mt-3 font-serif text-[34px] leading-tight sm:text-[44px]">
              Shop by <em className="text-sea-teal">category</em>
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((p, i) => (
              <Reveal key={p.category} delay={i * 60}>
                <Link href={`${L.store("/products")}?category=${encodeURIComponent(p.category)}`} className="group relative block aspect-[4/3] overflow-hidden rounded-[24px] ring-1 ring-sea-line">
                  <div className="size-full transition-transform duration-700 group-hover:scale-105">
                    <ProductImage src={p.images[0]} name={p.category} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-sea-ink/75 via-sea-ink/10 to-transparent" />
                  <span className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-serif text-[21px] text-white sm:text-[25px]">
                    {p.category} <ArrowRight className="size-5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* the aquarium from the shop's own app */}
      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <Reveal className="mb-8 max-w-2xl">
          <p className="store-eyebrow">Take a break</p>
          <h2 className="mt-3 font-serif text-[34px] leading-tight sm:text-[44px]">
            Our little <em className="text-sea-teal">aquarium</em>
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-sea-body">Feed the fish, plant something, change the weather - tap around and see what happens.</p>
        </Reveal>
        <Reveal>
          <StoreTank />
        </Reveal>
      </section>

      {/* about teaser */}
      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-sea-ink px-6 py-12 text-sea-cream sm:px-12 sm:py-16">
          <Grass blades={70} seed={33} height={160} className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full opacity-50" />
          <div className="relative max-w-2xl">
            <p className="store-eyebrow !text-sea-cream/60">About {shop.name}</p>
            <p className="mt-4 font-serif text-[26px] leading-snug sm:text-[34px]">
              Importer &amp; supplier of <em className="text-sea-sprout">aquarium plants</em> &amp; accessories - for hobbyists who care about their tanks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={L.store("/about")} className={btn("light", "md")}>
                Our story
              </Link>
              <a href={waLink(shop.site.whatsapp)} target="_blank" rel="noopener noreferrer" className={btn("ghost", "md", "!text-sea-cream hover:!bg-white/10")}>
                <WhatsAppIcon className="size-[18px] text-wa" /> Message us
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

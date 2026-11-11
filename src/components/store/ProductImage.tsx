import { thumb as small } from "@/lib/site";
import { Fish, Grass } from "./Art";

/** A product photo, or - when the shop hasn't added one - a little aquascape with the product's initial. */
export function ProductImage({ src, name, thumb = true, className = "", eager = false }: { src?: string; name: string; thumb?: boolean; className?: string; eager?: boolean }) {
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photos uploaded by the shop, served from /api/img
      <img src={thumb ? small(src) : src} alt={name} loading={eager ? "eager" : "lazy"} decoding="async" className={`size-full object-cover ${className}`} />
    );
  const seed = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return (
    <div className={`@container relative size-full overflow-hidden bg-gradient-to-b from-sea-teal-soft to-sea-paper ${className}`} role="img" aria-label={`${name} (no photo yet)`}>
      <Grass blades={26} seed={seed} height={120} still className="absolute inset-x-0 bottom-0 h-[55%] w-full" />
      <Fish className="absolute left-[18%] top-[22%] w-[26%] opacity-70" />
      <span className="absolute right-[14%] top-[16%] font-serif text-[clamp(28px,9cqw,64px)] italic leading-none text-sea-teal/35">{name.trim()[0]?.toUpperCase()}</span>
    </div>
  );
}

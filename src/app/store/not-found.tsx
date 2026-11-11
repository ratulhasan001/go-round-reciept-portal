import Link from "next/link";
import { storeLinks } from "@/lib/server/links";
import { Fish } from "@/components/store/Art";
import { btn } from "@/components/store/ui";

export default async function StoreNotFound() {
  const L = await storeLinks();
  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
      <Fish className="sea-bob w-24" />
      <h1 className="mt-6 font-serif text-[40px]">
        This one <em className="text-sea-teal">swam away</em>
      </h1>
      <p className="mt-3 text-[15px] text-sea-body">We couldn&apos;t find that page or product.</p>
      <Link href={L.store("/products")} className={btn("primary", "lg", "mt-8")}>
        Back to the shop
      </Link>
    </div>
  );
}

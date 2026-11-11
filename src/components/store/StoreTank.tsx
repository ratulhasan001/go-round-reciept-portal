"use client";

import dynamic from "next/dynamic";

// The admin panel's interactive aquarium, in guest mode (fish, games and weather - never any shop data).
// It's a big piece of code, so it loads after the rest of the page.
const AquariumTank = dynamic(() => import("@/components/aquarium/AquariumTank").then((m) => m.AquariumTank), {
  ssr: false,
  loading: () => <div className="aspect-[16/10] w-full animate-pulse rounded-[28px] bg-sea-teal-soft" />,
});

export function StoreTank() {
  return <AquariumTank guest />;
}

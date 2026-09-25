"use client";

import { ViewTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { Mark, SECTIONS, SyncDot, lateral, sectionIndex, syncLabel } from "./nav";
import { cx } from "./ui";

/**
 * Page animations run on the browser's View Transitions API: the page is keyed by its path, so each
 * navigation exits the old page and enters the new one, with a direction chosen by the link
 * (see the ::view-transition rules in globals.css).
 */
function PageTransition({ path, children }: { path: string; children: React.ReactNode }) {
  const types = { "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-left": "nav-left", "nav-right": "nav-right", default: "nav-fade" };
  return (
    <ViewTransition key={path} enter={types} exit={types} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  if (path === "/login") return <>{children}</>;
  if (path === "/") return <PageTransition path={path}>{children}</PageTransition>;

  return (
    <div className="min-h-dvh">
      <NavBar path={path} />
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <PageTransition path={path}>{children}</PageTransition>
      </main>
    </div>
  );
}

function NavBar({ path }: { path: string }) {
  const { shop, mode, sync, authEnabled, logout } = useStore();
  const current = sectionIndex(path);
  const track = useRef<HTMLDivElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState<{ x: number; w: number; ready: boolean } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // slide the highlight under the current section
  const placedOnce = useRef(false);
  useLayoutEffect(() => {
    const place = () => {
      const el = links.current[current];
      if (!el) return setPill(null);
      setPill((p) => ({ x: el.offsetLeft, w: el.offsetWidth, ready: !!p }));
      // keep the current section visible in the scrollable phone navbar (jump there on first load, glide after)
      const t = track.current;
      if (t && t.scrollWidth > t.clientWidth)
        t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.offsetWidth) / 2, behavior: placedOnce.current ? "smooth" : "instant" });
      placedOnce.current = true;
    };
    place();
    // fonts change the link widths, so measure again once they have loaded
    let alive = true;
    void document.fonts?.ready.then(() => alive && place());
    window.addEventListener("resize", place);
    return () => {
      alive = false;
      window.removeEventListener("resize", place);
    };
  }, [current]);

  // publish the navbar height so sticky bars inside pages can sit right under it
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--nav-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={header}
      style={{ viewTransitionName: "site-header" }}
      className={cx("sticky top-0 z-40 bg-deep text-white transition-shadow duration-300", scrolled ? "shadow-lg shadow-deep/25" : "shadow-none")}
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 sm:px-6 lg:flex-nowrap lg:px-10 lg:py-3">
        <Link href="/" transitionTypes={["nav-back"]} className="group flex min-w-0 items-center gap-2.5 rounded-2xl py-1 pr-2" title="Home">
          <span className="relative">
            <Mark className="size-9 text-[13px] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-105" />
            <span className="absolute -bottom-1 -right-1 grid size-4.5 scale-0 place-items-center rounded-full bg-lime text-deep opacity-0 shadow transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <House className="size-2.5" strokeWidth={3} />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[15.5px] font-bold leading-tight">{shop.name}</span>
            <span className="block text-[11px] font-semibold text-mint/70 transition-colors group-hover:text-lime">← Home</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1 lg:order-last lg:ml-0">
          <span className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-semibold text-mint/90" title={syncLabel(mode, sync)}>
            <SyncDot mode={mode} sync={sync} />
            <span className="hidden sm:inline">{syncLabel(mode, sync, true)}</span>
          </span>
          {authEnabled && (
            <button
              onClick={() => void logout()}
              className="grid size-9 place-items-center rounded-xl text-mint/70 transition hover:bg-white/10 hover:text-white active:scale-90"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-[18px]" />
            </button>
          )}
        </div>

        <nav className="order-last -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:order-none lg:mx-auto lg:w-auto" aria-label="Sections">
          <div ref={track} className="relative flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6 lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden">
            {pill && (
              <span
                aria-hidden
                className={cx(
                  "absolute left-0 top-0 h-10 rounded-xl bg-white/12 ring-1 ring-white/10",
                  pill.ready && "transition-[transform,width] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]",
                )}
                style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
              >
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-lime shadow-[0_0_12px_2px] shadow-lime/60" />
              </span>
            )}
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              const on = i === current;
              return (
                <Link
                  key={s.href}
                  ref={(el) => {
                    links.current[i] = el;
                  }}
                  href={s.href}
                  transitionTypes={lateral(current, i)}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "group relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13.5px] font-semibold transition-colors duration-300",
                    on ? "text-white" : "text-mint/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className={cx("size-[17px] transition-all duration-300", on ? "scale-110 text-lime" : "group-hover:-translate-y-0.5 group-hover:text-lime")} />
                  <span className="xl:hidden">{s.short}</span>
                  <span className="hidden xl:inline">{s.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}

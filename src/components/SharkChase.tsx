"use client";

import { useEffect, useRef } from "react";

type Vec = { x: number; y: number };
type Prey = Vec & { vx: number; vy: number; alive: boolean; respawn: number; goal: Vec; el: HTMLDivElement };
type Food = Vec & { seed: number; el: HTMLSpanElement };

const PREY = 7;

/**
 * Live layer for the big aquarium: a shark cruises, then hunts the small fish, which scatter; a catch is a chomp and
 * the fish respawns later. Tapping the water drops food the small fish swim to, and a pointer close by scares them.
 * Positions are simulated in px against the parent (the water) and written straight to the DOM each frame.
 */
export function SharkChase() {
  const layer = useRef<HTMLDivElement>(null);
  const sharkRef = useRef<HTMLDivElement>(null);
  const preyRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = layer.current!;
    const tank = root.parentElement!;
    const sharkEl = sharkRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = tank.clientWidth;
    let H = tank.clientHeight;
    let sharkW = sharkEl.offsetWidth;
    let preyW = preyRefs.current[0]?.offsetWidth ?? 24;
    const ro = new ResizeObserver(() => {
      W = tank.clientWidth;
      H = tank.clientHeight;
      sharkW = sharkEl.offsetWidth;
      preyW = preyRefs.current[0]?.offsetWidth ?? preyW;
    });
    ro.observe(tank);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const top = () => H * 0.1;
    const bottom = () => H * 0.68;
    const somewhere = (): Vec => ({ x: rand(W * 0.08, W * 0.92), y: rand(top(), bottom()) });
    const len = (x: number, y: number) => Math.hypot(x, y) || 1;
    const toward = (from: Vec, to: Vec, speed: number): Vec => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const l = len(dx, dy);
      return { x: (dx / l) * speed, y: (dy / l) * speed };
    };

    const prey: Prey[] = preyRefs.current.map((el) => ({ ...somewhere(), vx: rand(-20, 20), vy: 0, alive: true, respawn: 0, goal: somewhere(), el: el! }));
    const shark = { x: -sharkW, y: H * 0.4, vx: 40, vy: 0, hunting: false, until: rand(4, 7), goal: somewhere(), jaw: 0 };
    const food: Food[] = [];
    const pointer = { x: 0, y: 0, on: false };

    /** fish art faces right: flip when heading left, tilt with the climb */
    const place = (el: HTMLElement, x: number, y: number, vx: number, vy: number, w: number) => {
      const flip = vx < 0 ? -1 : 1;
      const tilt = Math.max(-0.5, Math.min(0.5, Math.atan2(vy, Math.abs(vx) + 1)));
      el.style.transform = `translate3d(${x - w / 2}px, ${y - (w * 0.4) / 2}px, 0) scaleX(${flip}) rotate(${tilt}rad)`;
    };
    const mouth = (): Vec => ({ x: shark.x + (shark.vx < 0 ? -1 : 1) * sharkW * 0.42, y: shark.y + sharkW * 0.03 });

    const chomp = (at: Vec) => {
      const burst = document.createElement("span");
      burst.className = "tank-chomp";
      burst.style.left = `${at.x}px`;
      burst.style.top = `${at.y}px`;
      for (let i = 0; i < 6; i++) {
        const b = document.createElement("i");
        b.style.setProperty("--a", `${i * 60 + rand(-15, 15)}deg`);
        burst.appendChild(b);
      }
      root.appendChild(burst);
      window.setTimeout(() => burst.remove(), 900);
    };

    const drop = (x: number, y: number) => {
      for (let i = 0; i < 5 && food.length < 30; i++) {
        const el = document.createElement("span");
        el.className = "tank-food";
        root.appendChild(el);
        food.push({ x: x + rand(-18, 18), y: y + rand(-6, 6), seed: rand(0, 6), el });
      }
    };
    const eatFood = (i: number) => {
      food[i]!.el.remove();
      food.splice(i, 1);
    };

    const local = (e: PointerEvent): Vec => {
      const r = tank.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      drop(p.x, Math.min(p.y, bottom()));
    };
    const onMove = (e: PointerEvent) => Object.assign(pointer, local(e), { on: true });
    const onLeave = () => (pointer.on = false);

    // still picture for reduced motion
    if (reduce) {
      for (const p of prey) place(p.el, p.x, p.y, 1, 0, preyW);
      place(sharkEl, W * 0.3, H * 0.35, 1, 0, sharkW);
      return () => ro.disconnect();
    }

    tank.addEventListener("pointerdown", onDown);
    tank.addEventListener("pointermove", onMove);
    tank.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = 0;
    let t = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      t += dt;
      const s = Math.max(0.6, Math.min(1, W / 900)); // slower in a small tank

      // food drifts down and settles
      for (let i = food.length - 1; i >= 0; i--) {
        const f = food[i]!;
        f.y += 22 * dt;
        f.x += Math.sin(t * 2 + f.seed) * 8 * dt;
        f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
        if (f.y > H * 0.84) eatFood(i);
      }

      // small fish
      const alive = prey.filter((p) => p.alive);
      const centre = alive.reduce((c, p) => ({ x: c.x + p.x / alive.length, y: c.y + p.y / alive.length }), { x: 0, y: 0 });
      const m = mouth();
      for (const p of prey) {
        if (!p.alive) {
          if (t < p.respawn) continue;
          Object.assign(p, { alive: true, x: Math.random() < 0.5 ? -preyW : W + preyW, y: rand(top(), bottom()), vx: 0, vy: 0, goal: somewhere() });
          p.el.style.opacity = "1";
        }
        if (len(p.goal.x - p.x, p.goal.y - p.y) < 20) p.goal = somewhere();
        let want = toward(p, p.goal, 40 * s);
        // loose schooling
        if (alive.length > 1) {
          const c = toward(p, centre, 12 * s);
          want = { x: want.x + c.x, y: want.y + c.y };
        }
        // food
        let near = -1;
        let nearD = 260;
        food.forEach((f, i) => {
          const d = len(f.x - p.x, f.y - p.y);
          if (d < nearD) [near, nearD] = [i, d];
        });
        if (near >= 0) {
          want = toward(p, food[near]!, 85 * s);
          if (nearD < 8) eatFood(near);
        }
        // danger beats hunger
        const ds = len(p.x - m.x, p.y - m.y);
        if (ds < 170 * s) want = toward(m, p, 115 * s);
        if (pointer.on && len(p.x - pointer.x, p.y - pointer.y) < 90) want = toward(pointer, p, 130 * s);
        // stay in the water
        if (p.y < top()) want.y += 60;
        if (p.y > bottom()) want.y -= 60;
        if (p.x < 16) want.x += 60;
        if (p.x > W - 16) want.x -= 60;

        const k = Math.min(1, dt * 3);
        p.vx += (want.x - p.vx) * k;
        p.vy += (want.y - p.vy) * k;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        place(p.el, p.x, p.y, p.vx, p.vy, preyW);
      }

      // shark: cruise a while, then hunt the nearest fish until a catch or it gives up
      let want: Vec;
      if (!shark.hunting) {
        if (len(shark.goal.x - shark.x, shark.goal.y - shark.y) < 40) shark.goal = somewhere();
        want = toward(shark, shark.goal, 45 * s);
        if (t > shark.until && alive.length) Object.assign(shark, { hunting: true, until: t + 9 });
      } else {
        const target = alive.reduce<Prey | null>((b, p) => (!b || len(p.x - m.x, p.y - m.y) < len(b.x - m.x, b.y - m.y) ? p : b), null);
        if (!target || t > shark.until) {
          Object.assign(shark, { hunting: false, until: t + rand(4, 7), goal: somewhere() });
          want = toward(shark, shark.goal, 45 * s);
        } else {
          want = toward(m, target, 128 * s);
          if (len(target.x - m.x, target.y - m.y) < 18) {
            target.alive = false;
            target.respawn = t + rand(4, 7);
            target.el.style.opacity = "0";
            shark.jaw = t + 0.35;
            chomp(m);
            Object.assign(shark, { hunting: false, until: t + rand(5, 8), goal: somewhere() });
          }
        }
      }
      if (shark.y < top()) want.y += 40;
      if (shark.y > bottom()) want.y -= 40;
      const k = Math.min(1, dt * 1.6);
      shark.vx += (want.x - shark.vx) * k;
      shark.vy += (want.y - shark.vy) * k;
      shark.x += shark.vx * dt;
      shark.y += shark.vy * dt;
      place(sharkEl, shark.x, shark.y, shark.vx, shark.vy * 0.6, sharkW);
      sharkEl.dataset.open = t < shark.jaw || (shark.hunting && len(shark.vx, shark.vy) > 90 * s) ? "1" : "";

      raf = requestAnimationFrame(frame);
    };

    // only run while the tank is on screen
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (e?.isIntersecting) raf = requestAnimationFrame(frame);
    });
    io.observe(tank);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      tank.removeEventListener("pointerdown", onDown);
      tank.removeEventListener("pointermove", onMove);
      tank.removeEventListener("pointerleave", onLeave);
      for (const f of food) f.el.remove();
    };
  }, []);

  return (
    <div ref={layer} className="pointer-events-none absolute inset-0">
      {Array.from({ length: PREY }, (_, i) => (
        <div key={i} ref={(el) => void (preyRefs.current[i] = el)} className="absolute left-0 top-0 w-6 transition-opacity duration-300 will-change-transform sm:w-7">
          <svg viewBox="0 0 30 12" className="w-full overflow-visible">
            <path d="M5 6 L0 1.5 L1.3 6 L0 10.5 Z" fill="#facc15" />
            <ellipse cx="16" cy="6" rx="12" ry="4.6" fill="#fde047" />
            <path d="M6 4.2 Q16 0.4 27 4.6 Q16 3 6 4.2 Z" fill="#2563eb" />
            <circle cx="24" cy="5" r="1.1" fill="#111" />
          </svg>
        </div>
      ))}

      <div ref={sharkRef} className="shark absolute left-0 top-0 w-28 drop-shadow-[0_8px_8px_rgb(0_0_0/0.25)] will-change-transform sm:w-40">
        <svg viewBox="0 0 160 64" className="w-full overflow-visible">
          <path className="shark-tail" d="M22 32 L4 6 Q12 26 10 32 Q12 40 6 54 Z" fill="#6b7f90" />
          <path d="M66 16 L82 -6 L94 18 Z" fill="#62768a" />
          <path d="M10 32 C 30 14, 80 8, 128 22 C 142 26, 154 30, 157 33 C 150 37, 136 41, 120 43 C 80 51, 34 47, 10 32 Z" fill="#7b8fa1" />
          <path d="M18 34 C 50 44, 96 48, 124 42 C 138 40, 150 37, 157 33 C 146 44, 110 52, 70 50 C 44 48, 26 42, 18 34 Z" fill="#e7edf2" />
          <path d="M86 42 L72 62 L102 44 Z" fill="#62768a" />
          <path d="M44 40 L40 50 L54 42 Z" fill="#62768a" />
          <g stroke="#51667a" strokeWidth="1.4" strokeLinecap="round">
            <path d="M106 28 Q104 34 106 40" fill="none" />
            <path d="M111 28 Q109 34 111 40" fill="none" />
            <path d="M116 28 Q114 34 116 40" fill="none" />
          </g>
          <circle cx="136" cy="27" r="2.3" fill="#0f172a" />
          <circle cx="136.7" cy="26.4" r="0.7" fill="#fff" />
          {/* closed mouth, and the open jaw shown while lunging or biting */}
          <path className="shark-shut" d="M128 37 Q140 39 150 35" stroke="#51667a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <g className="shark-jaw">
            <path d="M124 35 L156 32 L148 46 Q136 48 124 39 Z" fill="#4c0d0d" />
            <path d="M128 35 L131 39 L134 34.7 L137 38.6 L140 34.3 L143 38 L146 34 L149 37.5 L152 33.5" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
    </div>
  );
}

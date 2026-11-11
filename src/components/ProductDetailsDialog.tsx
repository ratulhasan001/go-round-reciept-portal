"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Images, Loader2, Star, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { tk, thumb } from "@/lib/site";
import type { Product } from "@/lib/types";
import { Modal } from "./Modal";
import { DescriptionEditor } from "./DescriptionEditor";
import { Field, Input, Switch, cx, useToast } from "./ui";

const MAX_PHOTOS = 8;

const subExample = (category: string) => (/filter/i.test(category) ? "Filter media, Filter accessories" : /plant/i.test(category) ? "Stem plants, Carpet plants" : "a type within it");

/** Draws the image at most `max` px on its longest side. */
async function drawScaled(file: File, max: number) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; // transparent PNGs get a white background in JPEG
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((resolve) => c.toBlob(resolve, type, q));

/** WebP where the browser can make it (older Safari can't), JPEG otherwise. */
async function encode(c: HTMLCanvasElement) {
  const webp = await toBlob(c, "image/webp", 0.85);
  if (webp?.type === "image/webp") return webp;
  const jpg = await toBlob(c, "image/jpeg", 0.85);
  if (!jpg) throw new Error("encode failed");
  return jpg;
}

/** Saves one photo: to the database in cloud mode, or as a small data URL on this device. */
async function storePhoto(file: File, cloud: boolean): Promise<string> {
  if (!cloud) return (await drawScaled(file, 800)).toDataURL("image/jpeg", 0.8);
  const [full, small] = await Promise.all([drawScaled(file, 1400).then(encode), drawScaled(file, 480).then(encode)]);
  const form = new FormData();
  form.set("full", full, "full");
  form.set("thumb", small, "thumb");
  const res = await fetch("/api/images", { method: "POST", body: form });
  const body = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !body?.url) throw new Error(body?.error ?? "Upload failed");
  return body.url;
}

const forget = (url: string) => {
  if (url.startsWith("/api/img/")) void fetch(`/api/images?url=${encodeURIComponent(url)}`, { method: "DELETE" }).catch(() => null);
};

/** Photo button for a product row: shows how many photos it has and opens the details dialog. */
export function ProductDetailsButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const n = product.images?.length ?? 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx("relative grid h-10 flex-1 place-items-center rounded-lg transition", "text-faint hover:bg-aqua-soft hover:text-aqua-deep")}
        aria-label={`Photos and website details for ${product.name || "product"}`}
        title="Photos & details"
      >
        <Images className="size-4" />
        {n > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-aqua-deep px-1 text-[10px] font-bold text-white">{n}</span>}
      </button>
      {open && <ProductDetailsDialog productId={product.id} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ProductDetailsDialog({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { products, setProducts, mode } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0); // photos still uploading
  const [drag, setDrag] = useState(false);
  // the newest list, so photos finishing one after another don't overwrite each other
  const latest = useRef(products);
  useEffect(() => {
    latest.current = products;
  });

  const p = products.find((x) => x.id === productId);
  if (!p) return null;
  const images = p.images ?? [];
  const categories = [...new Set(products.map((x) => x.category?.trim()).filter(Boolean) as string[])].sort();
  // subcategories already used in this product's category
  const sameCat = (x: Product) => !!p.category?.trim() && x.category?.trim().toLowerCase() === p.category.trim().toLowerCase();
  const subcategories = [...new Set(products.filter(sameCat).map((x) => x.subcategory?.trim()).filter(Boolean) as string[])].sort();

  const update = (patch: Partial<Product>) =>
    setProducts(latest.current.map((x) => (x.id === productId ? { ...x, ...patch, updatedAt: Date.now() } : x)));
  const currentImages = () => latest.current.find((x) => x.id === productId)?.images ?? [];

  const add = async (files: File[]) => {
    const room = MAX_PHOTOS - currentImages().length;
    const picked = files.filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    if (!picked.length) return toast(room <= 0 ? `Up to ${MAX_PHOTOS} photos per product` : "Choose a photo file", "err");
    setBusy((b) => b + picked.length);
    let failed = 0;
    for (const f of picked) {
      try {
        const url = await storePhoto(f, mode === "cloud");
        update({ images: [...currentImages(), url] });
      } catch {
        failed++;
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (failed) toast(`${failed} photo${failed === 1 ? "" : "s"} couldn't be uploaded`, "err");
    else toast(picked.length === 1 ? "Photo added" : `${picked.length} photos added`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      icon={<Images className="size-5" />}
      title={p.name.trim() || "Untitled product"}
      subtitle={`${tk(p.price)}${p.unit ? ` / ${p.unit}` : ""} · photos and website details`}
    >
      <div className="flex flex-col gap-5 p-5">
        {/* photos */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Photos</span>
            <span className="text-[12px] text-muted">The first one is the cover · no photo shows a simple placeholder</span>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void add([...e.dataTransfer.files]);
            }}
            className={cx("grid grid-cols-3 gap-2.5 rounded-2xl p-1 transition sm:grid-cols-4", drag && "bg-aqua-soft ring-2 ring-aqua-deep/40")}
          >
            {images.map((src, i) => (
              <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded product photo */}
                <img src={thumb(src)} alt="" className="size-full object-cover" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-deep/85 px-2 py-0.5 text-[10.5px] font-bold text-lime">Cover</span>}
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => update({ images: [src, ...images.filter((x) => x !== src)] })}
                      className="grid size-8 place-items-center rounded-lg bg-white/90 text-ink shadow transition hover:bg-white active:scale-90"
                      aria-label="Make cover photo"
                      title="Make cover"
                    >
                      <Star className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      update({ images: images.filter((x) => x !== src) });
                      forget(src);
                    }}
                    className="grid size-8 place-items-center rounded-lg bg-white/90 text-red-600 shadow transition hover:bg-white active:scale-90"
                    aria-label="Remove photo"
                    title="Remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
            {Array.from({ length: busy }, (_, i) => (
              <div key={`busy-${i}`} className="grid aspect-square place-items-center rounded-xl border border-dashed border-line bg-canvas text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ))}
            {images.length + busy < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-muted transition hover:border-aqua-deep hover:bg-aqua-soft hover:text-aqua-deep"
              >
                <ImagePlus className="size-6" />
                <span className="text-[12px] font-semibold">Add photos</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              void add(files);
            }}
          />
          {mode !== "cloud" && <p className="mt-2 text-[12px] text-amber-700">Saved on this device only, as smaller copies. Connect the cloud database to show photos on the live website.</p>}
        </div>

        <Field label="Description">
          <DescriptionEditor value={p.description ?? ""} placeholder="What it is, size, who it's for, how to use it…" onChange={(description) => update({ description })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Input list="product-categories" value={p.category ?? ""} placeholder="e.g. Filter, Plants, Fertilisers" onChange={(e) => update({ category: e.target.value })} />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Subcategory (optional)">
            <Input
              list="product-subcategories"
              value={p.subcategory ?? ""}
              disabled={!p.category?.trim()}
              placeholder={p.category?.trim() ? `e.g. ${subExample(p.category)}` : "Pick a category first"}
              onChange={(e) => update({ subcategory: e.target.value })}
            />
            <datalist id="product-subcategories">
              {subcategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        {p.category?.trim() && (
          <p className="-mt-3 text-[12px] text-muted">
            On the website: <b className="text-ink">{p.category.trim()}</b>
            {p.subcategory?.trim() && (
              <>
                {" › "}
                <b className="text-ink">{p.subcategory.trim()}</b>
              </>
            )}
            {" · "}customers filter the shop by category, then by subcategory.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-3">
            <span>
              <span className="block text-[14px] font-bold">Show on website</span>
              <span className="block text-[12px] text-muted">{p.onSite !== false ? "Customers can see and order it" : "Hidden - receipts only"}</span>
            </span>
            <Switch checked={p.onSite !== false} label="Show on website" onChange={(v) => update({ onSite: v })} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-3">
            <span>
              <span className="block text-[14px] font-bold">Feature on home page</span>
              <span className="block text-[12px] text-muted">{p.featured ? "Shown first on the store" : "Not featured"}</span>
            </span>
            <Switch checked={!!p.featured} label="Feature on home page" onChange={(v) => update({ featured: v })} />
          </label>
        </div>
        {p.inStock === false && <p className="-mt-2 text-[12.5px] text-amber-700">This product is out of stock: the website shows it, but customers can&apos;t add it to their cart.</p>}
        {!(p.price > 0) && <p className="-mt-2 text-[12.5px] text-amber-700">Products without a price aren&apos;t shown on the website.</p>}
      </div>
    </Modal>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Go Round Admin",
    short_name: "GR Admin",
    description: "Go Round admin panel: website orders, receipts, products, customers and staff.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3efe6",
    theme_color: "#f3efe6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

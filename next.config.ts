import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the customer page "Track your order" became "Order status"; old links still work
  async redirects() {
    return [{ source: "/store/track", destination: "/store/order-status", permanent: true }];
  },
};

export default nextConfig;

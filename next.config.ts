import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Next's default scroll handler gives up when the first DOM node of a page
    // is a hoisted <head> element (the title, metadata or an image preload), so
    // a new page can open at the old page's scroll position. Next's own source
    // says this flag fixes it. It is undocumented, so keep `next` pinned and
    // re-check it when upgrading.
    appNewScrollHandler: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kebnjkhzrqayzsqshfgt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

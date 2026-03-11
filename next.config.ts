import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'n-e-x-u-s-o-s.com',
    'www.n-e-x-u-s-o-s.com',
    '*.cloudflare.com',
    '*.trycloudflare.com',
    'https://n-e-x-u-s-o-s.com',
    'https://www.n-e-x-u-s-o-s.com',
    'create-nexus.space.z.ai',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: [
    '@toli/domain',
    '@toli/application',
    '@toli/catalog',
    '@toli/ui',
    '@toli/infra-client',
  ],
  experimental: {
    optimizePackageImports: ['firebase/firestore', 'firebase/auth', 'firebase/functions'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

export default nextConfig;

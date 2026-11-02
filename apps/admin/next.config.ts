import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@pzr/shared'],
  poweredByHeader: false,
};

export default nextConfig;

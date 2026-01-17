import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdf-parse'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'canvas': 'commonjs canvas',
        'pdf-parse': 'commonjs pdf-parse',
      });
    }
    // Ignore the pdf-parse test file
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      './test/data/05-versions-space.pdf': false,
    };
    return config;
  },
};

export default nextConfig;

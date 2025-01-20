/** @type {import('next').NextConfig} */
const { join } = require('path');

const nextConfig = {
  // Disable file tracing entirely for now
  output: 'standalone',
  experimental: {
    // Disable automatic static optimization
    isrMemoryCacheSize: 0
  },
  // Add more specific webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore certain modules in client-side builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false
      };
    }
    return config;
  }
}

module.exports = nextConfig 
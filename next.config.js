/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Exclude certain directories from build traces
    outputFileTracingIgnores: [
      'captures/**',
      'recordings/**',
      '**/node_modules/canvas/**',
      '**/node_modules/jsdom/**'
    ],
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
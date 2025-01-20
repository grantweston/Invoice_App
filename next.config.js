/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable file tracing entirely for now
  output: 'standalone',
  experimental: {
    // Disable automatic static optimization
    isrMemoryCacheSize: 0,
    // Explicitly configure tracing
    outputFileTracingRoot: join(__dirname, '../../'),
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        '**/node_modules/canvas/**',
        '**/node_modules/jsdom/**',
        'captures/**',
        'recordings/**',
        '.next/**',
        'dist/**',
      ],
    },
    // Only include necessary files
    outputFileTracingIncludes: {
      '/': ['package.json'],
    },
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
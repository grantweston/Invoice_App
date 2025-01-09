/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize build by excluding test files and limiting pattern matching
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  typescript: {
    // Don't fail build on type errors for now
    ignoreBuildErrors: true,
  },
  eslint: {
    // Don't fail build on eslint errors for now
    ignoreDuringBuilds: true,
  },
  // Disable unnecessary features
  optimizeFonts: false,
  // Add output configuration
  output: 'standalone',
  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Split chunks more aggressively
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 10000,
        maxSize: 40000,
        cacheGroups: {
          default: false,
          vendors: false,
          // Native modules chunk
          native: {
            name: 'native-modules',
            test: /[\\/]node_modules[\\/](@next\/swc-.*|@img\/sharp-.*|sharp|gm)[\\/]/,
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // Vendor chunk for large dependencies
          largeVendors: {
            name: 'large-vendors',
            test: /[\\/]node_modules[\\/](googleapis|google-auth-library|pdf2pic|archiver|unzipper|exceljs)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Regular vendor chunk
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };

      // Exclude native modules from server bundle
      if (isServer) {
        config.externals = [...(config.externals || []), 
          '@next/swc-darwin-arm64',
          '@img/sharp-libvips',
          'sharp',
          'gm'
        ];
      }
    }
    return config;
  },
  // Experimental features
  experimental: {
    // Increase memory limit
    memoryBasedWorkersCount: true,
    // Enable output tracing
    outputFileTracingRoot: "/",
    // More aggressive exclusions
    outputFileTracingExcludes: {
      '*': [
        // Native modules
        'node_modules/@next/swc-*/**',
        'node_modules/@swc/core-*/**',
        'node_modules/@esbuild/**',
        'node_modules/@img/sharp-*/**',
        // Development files
        'node_modules/**/*.md',
        'node_modules/**/*.d.ts',
        'node_modules/**/*.map',
        'node_modules/**/*.ts',
        'node_modules/**/*.test.js',
        'node_modules/**/*.spec.js',
        // Large modules that should be loaded dynamically
        'node_modules/sharp/**',
        'node_modules/gm/**',
        'node_modules/pdf2pic/**',
        'node_modules/archiver/**',
        'node_modules/unzipper/**',
        'node_modules/exceljs/**',
        'node_modules/googleapis/**',
        'node_modules/google-auth-library/**',
      ],
    },
    // Optimize loading of large packages
    optimizePackageImports: [
      '@googleapis/docs',
      'exceljs',
      'sharp',
    ],
  }
}

module.exports = nextConfig 
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  // Ignore build-time files
  distDir: '.next',
  cleanDistDir: true,
  webpack: (config, { dev, isServer }) => {
    if (!dev && isServer) {
      // Externalize all node_modules on server
      const originalExternal = config.externals;
      config.externals = [
        ...(typeof originalExternal === 'function' ? [] : originalExternal || []),
        'sharp',
        'gm',
        'pdf2pic',
        'archiver',
        'unzipper',
        'exceljs',
        'googleapis',
        'google-auth-library',
      ];
    }
    return config;
  },
  experimental: {
    // Simple pattern to avoid recursion
    outputFileTracingExcludes: {
      '*': [
        // Build and cache directories
        'node_modules/.pnpm/**',
        '.next/**',
        'dist/**',
        // Test and doc files
        'node_modules/**/+(test|tests)/**',
        'node_modules/**/*.+(md|d.ts|map)',
        // Local storage directories
        'recordings/**',
        'captures/**',
        'tmp/**',
      ],
    },
  }
}

module.exports = nextConfig 
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
        'node_modules/.pnpm/**',
        '.next/**',
        'node_modules/**/+(test|tests)/**',
        'node_modules/**/*.+(md|d.ts|map)',
      ],
    },
  }
}

module.exports = nextConfig 
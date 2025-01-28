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
      const originalExternal = config.externals;
      const externals = [
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
      config.externals = externals;
    }
    return config;
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/.pnpm/**',
        '.next/**',
        'dist/**',
        'node_modules/**/+(test|tests)/**',
        'node_modules/**/*.+(md|d.ts|map)',
        'recordings/**',
        'captures/**',
        'tmp/**',
        '**/screenshots/**',
        '**/screen-captures/**',
        '**/*.+(jpg|jpeg|png|gif|webp|webm)',
      ],
    },
    outputFileTracingIncludes: {
      '**': [
        'next.config.js',
        'package.json',
      ],
    },
    outputFileTracingRoot: process.cwd(),
  },
  // Add more logging options
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig

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
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        'node_modules/.pnpm',
        '.next',
        'dist',
        'node_modules/**/test',
        'node_modules/**/tests',
        'node_modules/**/*.md',
        'node_modules/**/*.d.ts',
        'node_modules/**/*.map'
      ]
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

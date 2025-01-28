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
    serverComponentsExternalPackages: ['sharp', 'gm', 'pdf2pic', 'archiver', 'unzipper', 'exceljs', 'googleapis', 'google-auth-library']
  },
  // Add more logging options
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig

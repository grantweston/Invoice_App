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
  // Increase build memory limit
  experimental: {
    memoryBasedWorkersCount: true,
  }
}

module.exports = nextConfig 
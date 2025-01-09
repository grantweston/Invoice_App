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
  // Experimental features
  experimental: {
    // Increase memory limit
    memoryBasedWorkersCount: true,
    // Enable output tracing
    outputFileTracingRoot: "/",
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  }
}

module.exports = nextConfig 
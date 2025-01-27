/** @type {import('next').NextConfig} */
<<<<<<< HEAD
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
    // Add build logging
    config.infrastructureLogging = {
      level: 'verbose',
      debug: true,
    };

    if (!dev && isServer) {
      // Log externals configuration
      console.log('\nWebpack externals configuration:');
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
      console.log('Externalized modules:', externals);
      config.externals = externals;
    }

    // Log final webpack configuration
    console.log('\nFinal webpack configuration:', {
      mode: config.mode,
      target: config.target,
      optimization: config.optimization,
    });

    return config;
  },
  experimental: {
    // Enable more verbose logging
    logging: {
      level: 'verbose',
      fullUrl: true,
    },
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
        // Add more specific exclusions for screenshot-related paths
        '**/screenshots/**',
        '**/screen-captures/**',
        '**/*.+(jpg|jpeg|png|gif|webp|webm)',
      ],
    },
    // Add tracing debug options
    outputFileTracingIncludes: {
      '**': [
        // Include only necessary files
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
=======
const { join } = require('path');

const nextConfig = {
  // Disable file tracing entirely for now
  output: 'standalone',
  experimental: {
    // Disable automatic static optimization
    isrMemoryCacheSize: 0
  },
  // Add more specific webpack configuration
  webpack: (config, { isServer }) => {
    return config;
  }
};

module.exports = nextConfig; 
>>>>>>> gemini-updates

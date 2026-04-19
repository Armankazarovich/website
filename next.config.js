/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/contact', destination: '/contacts', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Манифесты — без кэша (обновляются сразу)
        source: '/:path(manifest\\.json|admin-manifest\\.json)',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        // Service Worker — без кэша, явный тип и разрешённый scope
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // Статические файлы Next.js — кэш на 1 год (immutable)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Изображения и медиа — кэш на 30 дней
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        // Иконки и статика — кэш на 7 дней
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
        ],
      },
      {
        // Security headers — все страницы
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    domains: ['localhost', 'pilo-rus.ru', 'pilmos.ru'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней кэш
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'pilo-rus.ru'],
    },
    serverComponentsExternalPackages: [
      '@react-pdf/renderer',
      '@imgly/background-removal-node',
      'onnxruntime-node',
    ],
  },
  webpack: (config, { webpack }) => {
    // Prevent webpack from trying to bundle onnxruntime-web in the browser bundle.
    // Background removal is done server-side via @imgly/background-removal-node.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^onnxruntime-web(\/.*)?$/,
      })
    );
    return config;
  },
  // Skip type checking and linting during build (already checked locally)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

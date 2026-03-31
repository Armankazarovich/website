const withPWA = require('next-pwa')({
  dest: 'public',
  register: false,
  skipWaiting: true,
  disable: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

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
    serverComponentsExternalPackages: ['@react-pdf/renderer', '@imgly/background-removal', 'onnxruntime-web'],
  },
  webpack: (config, { webpack }) => {
    // @imgly/background-removal dynamically imports onnxruntime-web at runtime.
    // Tell webpack to ignore these imports at bundle time — they will resolve
    // via the package's own CDN/wasm loading mechanism in the browser.
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

module.exports = withPWA(nextConfig);

const ignoredWatchPaths =
  /([\\/](?:node_modules|\.git|\.next|backups|System Volume Information)([\\/]|$))|([\\/](?:pagefile\.sys|DumpStack\.log\.tmp)$)|(^D:[\\/](?:pagefile\.sys|DumpStack\.log\.tmp)$)/i;
const isProduction = process.env.NODE_ENV === 'production';
const liveNoStoreHeaders = [
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'Expires', value: '0' },
];

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
        // Live workspaces must never reuse a stale shell after a deploy.
        source: '/admin/:path*',
        headers: liveNoStoreHeaders,
      },
      {
        source: '/cabinet/:path*',
        headers: liveNoStoreHeaders,
      },
      {
        source: '/checkout/:path*',
        headers: liveNoStoreHeaders,
      },
      {
        source: '/login',
        headers: liveNoStoreHeaders,
      },
      {
        // Admin APIs are always live data.
        source: '/api/admin/:path*',
        headers: liveNoStoreHeaders,
      },
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
          {
            key: 'Cache-Control',
            value: isProduction
              ? 'public, max-age=31536000, immutable'
              : 'no-cache, no-store, must-revalidate',
          },
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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'pilo-rus.ru', pathname: '/**' },
      { protocol: 'https', hostname: 'zaidr.ru', pathname: '/**' },
      { protocol: 'https', hostname: 'pilmos.ru', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней кэш
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'pilo-rus.ru', 'zaidr.ru'],
    },
    serverComponentsExternalPackages: [
      '@react-pdf/renderer',
      '@imgly/background-removal-node',
      'onnxruntime-node',
      'googleapis',
      'sharp',
      'bcryptjs',
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: ignoredWatchPaths,
    };

    // Prevent webpack from trying to bundle onnxruntime-web in the browser bundle.
    // Background removal is done server-side via @imgly/background-removal-node.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^onnxruntime-web(\/.*)?$/,
      })
    );

    // Multi-tenancy: lib/tenant-context использует "async_hooks" (Node-only).
    // Иногда client component тянет цепочку lib/prisma → lib/tenant-context.
    // На server этот fallback не нужен — async_hooks доступен. На client/edge —
    // подменяем модуль на false (no-op), чтобы webpack не падал на Module not found.
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        async_hooks: false,
      };
    }
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

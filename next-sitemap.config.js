/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXTAUTH_URL || 'https://pilo-rus.ru',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/admin', '/admin/*', '/cabinet', '/cabinet/*', '/api/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/admin', '/cabinet', '/api'] },
    ],
    additionalSitemaps: [
      `${process.env.NEXTAUTH_URL || 'https://pilo-rus.ru'}/sitemap.xml`,
    ],
  },
  additionalPaths: async (config) => [
    await config.transform(config, '/'),
    await config.transform(config, '/catalog'),
    await config.transform(config, '/about'),
    await config.transform(config, '/delivery'),
    await config.transform(config, '/contacts'),
    await config.transform(config, '/promotions'),
  ],
};

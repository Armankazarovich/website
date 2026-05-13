import type { MetadataRoute } from "next";

const BASE_URL = "https://pilo-rus.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/cabinet/",
        "/api/",
        "/cart",
        "/checkout",
        "/wishlist",
        "/track",
        "/login",
        "/register",
        "/*?search=",
        "/*?sort=",
        "/*?page=",
        "/*?size=",
        "/*?instock=",
        "/*?minprice=",
        "/*?maxprice=",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

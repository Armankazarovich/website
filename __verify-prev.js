const https = require("https");

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "PiloRus-Check/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data, location: res.headers.location }));
    }).on("error", reject);
  });
}

async function main() {
  // 1. Check homepage - should have dynamic rating (not hardcoded 4.9)
  const home = await fetchPage("https://pilo-rus.ru/");
  console.log("=== Homepage ===");
  console.log("Status:", home.status);
  // Look for the rating section
  const ratingMatch = home.body.match(/font-bold text-6xl[^>]*>([^<]+)/);
  console.log("Rating on homepage:", ratingMatch ? ratingMatch[1] : "NOT FOUND");
  const has49 = home.body.includes('>4.9<');
  console.log("Has hardcoded 4.9:", has49 ? "YES (old)" : "NO (good - dynamic)");

  // 2. Check catalog page loads with filters
  const catalog = await fetchPage("https://pilo-rus.ru/catalog");
  console.log("\n=== Catalog ===");
  console.log("Status:", catalog.status);
  // Check for product count badges in sidebar
  const hasCount = catalog.body.includes('text-muted-foreground/70');
  console.log("Has product count badges:", hasCount ? "YES (new)" : "NO");

  // 3. Check catalog with type filter preserves other params
  const catFiltered = await fetchPage("https://pilo-rus.ru/catalog?type=%D0%B4%D0%BE%D1%81%D0%BA%D0%B0&instock=1");
  console.log("\n=== Catalog with type+instock filter ===");
  console.log("Status:", catFiltered.status);
  // Should show products
  const productCards = (catFiltered.body.match(/product-card/g) || []).length;
  console.log("Product card mentions:", productCards);

  console.log("\n=== DONE ===");
}

main().catch(e => console.log("Error:", e.message));

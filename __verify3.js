const https = require("https");

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "PiloRus-Check/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

async function main() {
  // Check catalog with type filter — should preserve other params in type bar links
  const cat = await fetchPage("https://pilo-rus.ru/catalog");
  console.log("Catalog status:", cat.status);
  
  // Check if type filter links include preserveParams pattern
  // Old: href="/catalog?type=X&category=Y" (only type+category)  
  // New: should include sort, size, instock etc
  
  // Check for _count product badges - look for the count number after category name
  const catNames = cat.body.match(/<span>([^<]+)<\/span>\s*<span class="text-xs/g);
  console.log("Category count badges found:", catNames ? catNames.length : 0);

  // Check catalog with type=доска (no instock)
  const catType = await fetchPage("https://pilo-rus.ru/catalog?type=%D0%B4%D0%BE%D1%81%D0%BA%D0%B0");
  console.log("\nCatalog type=доска status:", catType.status);
  const hasProducts = catType.body.includes('product-card') || catType.body.includes('ProductCard');
  console.log("Has products:", hasProducts);
  
  // Check for "Товары не найдены"
  const noProducts = catType.body.includes("Товары не найдены");
  console.log("Shows 'no products':", noProducts);
  
  // Check buildFilterUrl is used (look for the × remove filter button)
  const hasFilterRemove = catType.body.includes('hover:text-destructive');
  console.log("Has filter remove button:", hasFilterRemove);

  // Quick snippet of the filter area
  const filterArea = catType.body.indexOf("Тип:");
  if (filterArea > -1) {
    console.log("\nFilter area snippet:", catType.body.substring(filterArea, filterArea + 200));
  }
  
  console.log("\n=== DONE ===");
}

main().catch(e => console.log("Error:", e.message));

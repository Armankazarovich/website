const https = require("https");

const urls = [
  "https://pilo-rus.ru/",
  "https://pilo-rus.ru/catalog",
  "https://pilo-rus.ru/catalog?type=%D0%B4%D0%BE%D1%81%D0%BA%D0%B0",
  "https://pilo-rus.ru/admin",
  "https://pilo-rus.ru/api/admin/products",
];

let done = 0;
for (const url of urls) {
  const req = https.get(url, { headers: { "User-Agent": "PiloRus-Check/1.0" } }, (res) => {
    console.log(res.statusCode, url.replace("https://pilo-rus.ru", ""));
    done++;
    if (done === urls.length) console.log("\nAll checked!");
  });
  req.on("error", (e) => {
    console.log("ERR", url, e.message);
    done++;
  });
  req.setTimeout(15000);
}

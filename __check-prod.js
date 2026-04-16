const https = require("https");
const urls = [
  "https://pilo-rus.ru/",
  "https://pilo-rus.ru/catalog",
  "https://pilo-rus.ru/login",
  "https://pilo-rus.ru/admin",
  "https://pilo-rus.ru/about",
  "https://pilo-rus.ru/cabinet",
  "https://pilo-rus.ru/api/reviews?limit=1",
];

console.log("Checking production pages...\n");
let done = 0;
let allOk = true;
urls.forEach((u) => {
  https.get(u, { timeout: 15000 }, (r) => {
    const ok = r.statusCode >= 200 && r.statusCode < 400;
    if (!ok) allOk = false;
    console.log(ok ? "OK" : "FAIL", r.statusCode, u);
    if (++done === urls.length) {
      console.log("\n" + (allOk ? "ALL PAGES OK!" : "SOME PAGES FAILED!"));
    }
  }).on("error", (e) => {
    allOk = false;
    console.log("ERR", u, e.message);
    if (++done === urls.length) {
      console.log("\n" + (allOk ? "ALL PAGES OK!" : "SOME PAGES FAILED!"));
    }
  });
});
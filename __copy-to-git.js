const fs = require("fs");
const path = require("path");

const src = "D:/ПилоРус/website";
const dst = "D:/pilorus/website";

const files = [
  "components/store/aray-widget.tsx",
];

for (const f of files) {
  const srcPath = path.join(src, f);
  const dstPath = path.join(dst, f);
  fs.copyFileSync(srcPath, dstPath);
  console.log("Copied:", f, "(" + fs.statSync(dstPath).size + " bytes)");
}
console.log("Done!");

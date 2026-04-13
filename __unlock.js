const fs = require("fs");
const lockFile = "D:/pilorus/website/.git/index.lock";
try {
  fs.unlinkSync(lockFile);
  console.log("Lock file deleted");
} catch (e) {
  console.log("No lock file or error:", e.message);
}

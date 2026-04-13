const { execSync } = require("child_process");
process.chdir("D:/pilorus/website");

try {
  console.log("Adding...");
  execSync("git add app/api/ai/tts/route.ts", { stdio: "inherit" });

  console.log("Committing...");
  execSync('git commit -m "fix: tts-cloudflare-proxy"', { stdio: "inherit" });

  console.log("Pushing...");
  execSync("git push origin main", { stdio: "inherit" });

  console.log("DONE! Deploy started.");
} catch (e) {
  console.error("Error:", e.message);
}

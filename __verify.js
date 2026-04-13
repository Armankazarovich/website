const fs = require("fs");
const c = fs.readFileSync("D:/pilorus/website/components/store/aray-widget.tsx", "utf8");
console.log("Has kbOpen:", c.includes("kbOpen"));
console.log("Has kbHeight:", c.includes("kbHeight"));
console.log("Has silenceTimer:", c.includes("silenceTimer"));
console.log("Has continuous = !isIOS:", c.includes("continuous = !isIOS"));
console.log("Voice-first sendMessage:", c.includes('if (voiceModeRef.current === "text") setShowMessages(true)'));
console.log("Size:", c.length, "chars");

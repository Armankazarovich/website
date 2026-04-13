const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = "D:/ПилоРус/website";
const dst = "D:/pilorus/website";

// Map VM paths for reading
const srcVM = "/sessions/affectionate-wizardly-turing/mnt/website";
const dstVM = "/sessions/affectionate-wizardly-turing/mnt/website/../../../pilorus/website";

const files = [
  "components/shared/aray-orb.tsx",
  "components/store/aray-widget.tsx",
  "components/store/mobile-bottom-nav.tsx",
  "components/admin/admin-mobile-bottom-nav.tsx",
  "components/ui/input.tsx",
];

// We can't use Windows paths in Linux VM, so we'll do it differently
// Just write the script content and instructions
console.log("Files to deploy:");
files.forEach(f => console.log("  " + f));

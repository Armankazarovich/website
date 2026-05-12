/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const recoveryDir = path.join(root, "docs", "recovery", "sections");
const logPath = path.join(root, "docs", "recovery", "SECTION_CHANGE_LOG.md");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : "true";
    args[key] = value;
    if (value !== "true") index += 1;
  }
  return args;
}

function slugify(value) {
  return String(value || "section")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё._-]+/giu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "section";
}

function nowStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

const args = parseArgs(process.argv.slice(2));
const fileArg = args.file || args.path;

if (!fileArg || !args.section || !args.reason) {
  console.error("Usage: npm run section:snapshot -- --file <path> --section <name> --reason <short-reason>");
  process.exit(1);
}

const source = path.resolve(root, fileArg);
if (!source.startsWith(root + path.sep)) {
  console.error(`Refusing to snapshot outside project root: ${source}`);
  process.exit(1);
}

if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
  console.error(`File does not exist: ${path.relative(root, source)}`);
  process.exit(1);
}

fs.mkdirSync(recoveryDir, { recursive: true });

const relSource = path.relative(root, source).replace(/\\/g, "/");
const extension = path.extname(source) || ".txt";
const basename = `${nowStamp()}-${slugify(args.section)}-${slugify(args.reason)}${extension}`;
const target = path.join(recoveryDir, basename);

fs.copyFileSync(source, target);

const relTarget = path.relative(root, target).replace(/\\/g, "/");
const entry = [
  "",
  `## ${new Date().toISOString()} - ${args.section}`,
  "",
  `- Section: \`${args.section}\``,
  `- Source: \`${relSource}\``,
  `- Snapshot: \`${relTarget}\``,
  `- Reason: ${args.reason}`,
  "- Status: `DRAFT`",
  "- Approval: waiting for Arman review.",
  "",
].join("\n");

if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, "# Section Change Log\n", "utf8");
}
fs.appendFileSync(logPath, entry, "utf8");

console.log(`Snapshot saved: ${relTarget}`);
console.log(`Log updated: ${path.relative(root, logPath).replace(/\\/g, "/")}`);

/* eslint-disable no-console */
const fs = require("fs");

function normalizePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function hasDatabaseChanges(paths) {
  return paths
    .map(normalizePath)
    .filter(Boolean)
    .some((file) =>
      file === "prisma/schema.prisma" ||
      file === "prisma/data-migrate.ts" ||
      file.startsWith("prisma/migrations/"),
    );
}

if (require.main === module) {
  const changedFiles = fs.readFileSync(0, "utf8").split(/\r?\n/);
  process.stdout.write(hasDatabaseChanges(changedFiles) ? "true" : "false");
}

module.exports = { hasDatabaseChanges };

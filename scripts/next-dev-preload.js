const fs = require("fs");
const path = require("path");

const driveRoot = path.parse(process.cwd()).root;
const blockedWatchEntries = new Set(
  ["DumpStack.log.tmp", "pagefile.sys", "System Volume Information"].map((name) =>
    path.normalize(path.join(driveRoot, name)).toLowerCase()
  )
);

function isBlockedWatchEntry(target) {
  if (typeof target !== "string") return false;
  return blockedWatchEntries.has(path.normalize(target).toLowerCase());
}

function makeNotFoundError(target) {
  const err = new Error(`ENOENT: no such file or directory, lstat '${target}'`);
  err.code = "ENOENT";
  err.errno = -4058;
  err.syscall = "lstat";
  err.path = target;
  return err;
}

const originalLstat = fs.lstat;
fs.lstat = function patchedLstat(target, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }

  if (isBlockedWatchEntry(target)) {
    return process.nextTick(() => callback(makeNotFoundError(target)));
  }

  return typeof options === "undefined"
    ? originalLstat.call(this, target, callback)
    : originalLstat.call(this, target, options, callback);
};

const originalLstatSync = fs.lstatSync;
fs.lstatSync = function patchedLstatSync(target, options) {
  if (isBlockedWatchEntry(target)) {
    throw makeNotFoundError(target);
  }

  return typeof options === "undefined"
    ? originalLstatSync.call(this, target)
    : originalLstatSync.call(this, target, options);
};

const originalConsoleError = console.error;
console.error = function filteredConsoleError(...args) {
  const message = args.map(String).join(" ");
  if (
    message.includes("Watchpack Error (initial scan)") &&
    (message.includes(`${driveRoot}DumpStack.log.tmp`) ||
      message.includes(`${driveRoot}pagefile.sys`) ||
      message.includes(`${driveRoot}System Volume Information`))
  ) {
    return;
  }

  return originalConsoleError.apply(this, args);
};

process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT ||= process.cwd();
process.env.NEXT_TELEMETRY_DISABLED ||= "1";

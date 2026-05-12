#!/usr/bin/env node

const path = require("path");

const preloadPath = path.join(__dirname, "next-dev-preload.js").replace(/\\/g, "/");
const preloadOption = `--require=${preloadPath}`;
const nodeOptions = process.env.NODE_OPTIONS || "";

if (!nodeOptions.includes(preloadOption)) {
  process.env.NODE_OPTIONS = [nodeOptions, preloadOption].filter(Boolean).join(" ");
}

require("./next-dev-preload");

require("next/dist/bin/next");

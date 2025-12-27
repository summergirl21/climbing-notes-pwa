#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const srcPath = path.join(root, "index.html");
const destPath = path.join(root, "docs", "index.html");
const clerkSourcePath = path.join(
  root,
  "node_modules",
  "@clerk",
  "clerk-js",
  "dist",
  "clerk.browser.js"
);
const clerkDestPath = path.join(root, "docs", "vendor", "clerk.browser.js");

const html = fs.readFileSync(srcPath, "utf8");

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  });
  return env;
};

const fileEnv = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.local")),
};

const readEnv = (key) => process.env[key] || fileEnv[key];

const convexUrl = readEnv("CONVEX_URL");

let output = html;

if (convexUrl) {
  output = output.replace(
    /(<meta name="convex-url" content=")([^"]*)(")/,
    `$1${convexUrl}$3`
  );
}

fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.writeFileSync(destPath, output);

if (fs.existsSync(clerkSourcePath)) {
  fs.mkdirSync(path.dirname(clerkDestPath), { recursive: true });
  fs.copyFileSync(clerkSourcePath, clerkDestPath);
} else {
  console.warn(
    "[build-config] Clerk bundle not found. Run `npm install` to fetch @clerk/clerk-js."
  );
}

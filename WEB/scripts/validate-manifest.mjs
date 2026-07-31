import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const manifestPath = resolve(root, "public/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const required = ["name", "short_name", "start_url", "scope", "display", "background_color", "theme_color", "icons"];
for (const field of required) if (!manifest[field]) throw new Error(`manifest.json is missing ${field}`);
if (manifest.start_url !== "/" || manifest.scope !== "/" || manifest.display !== "standalone") throw new Error("manifest has invalid start URL, scope, or display mode");
if (!/^#[0-9a-f]{6}$/i.test(manifest.background_color) || !/^#[0-9a-f]{6}$/i.test(manifest.theme_color)) throw new Error("manifest colors must be six-digit hex values");
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) throw new Error("manifest requires at least one icon");
for (const icon of manifest.icons) {
  if (!icon.src?.startsWith("/") || !icon.type || !icon.sizes || !existsSync(resolve(root, "public", icon.src.slice(1)))) throw new Error(`manifest icon is invalid: ${icon.src ?? "unknown"}`);
}

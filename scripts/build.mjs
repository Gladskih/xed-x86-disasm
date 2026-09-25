import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
for (const name of ["browser.js", "node.js", "core.js", "index.d.ts"]) {
  await copyFile(new URL(`../src/${name}`, import.meta.url),
    new URL(`../dist/${name}`, import.meta.url));
}

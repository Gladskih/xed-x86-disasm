import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const pack = JSON.parse(await readFile(new URL("../pack-result.json", import.meta.url)))[0];
const tarball = resolve(fileURLToPath(new URL(pack.filename, root)));
const temporary = await mkdtemp(join(tmpdir(), "xed-package-"));
async function removeTemporary() {
  if (dirname(await realpath(temporary)) !== await realpath(tmpdir())) {
    throw new Error("Refusing to delete a directory outside the temporary root");
  }
  await rm(temporary, { recursive: true, force: true });
}
try {
  const installer = process.platform === "win32"
    ? [process.execPath, join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js")]
    : ["npm"];
  execFileSync(installer[0], [...installer.slice(1), "install", "--offline",
    "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    { cwd: temporary, stdio: "pipe" });
  await writeFile(join(temporary, "smoke.mjs"), `
    import assert from "node:assert/strict";
    import { createDisassembler } from "xed-x86-disasm";
    const decoder = await createDisassembler();
    assert.equal(decoder.decode(Uint8Array.of(0x90))[0].iclass, "NOP");
  `);
  execFileSync("node", ["smoke.mjs"], { cwd: temporary, stdio: "pipe" });
  assert(pack.files.some(file => file.path === "dist/xed.wasm"));
  assert(pack.files.some(file => file.path === "licenses/XED.txt"));
} finally {
  await removeTemporary();
}
console.log(`Installed and tested ${pack.filename}`);

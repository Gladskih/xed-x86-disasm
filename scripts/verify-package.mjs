import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

const wasm = await readFile(new URL("../dist/xed.wasm", import.meta.url));
const pins = JSON.parse(await readFile(new URL("../upstream.json", import.meta.url)));
const manifest = JSON.parse(await readFile(new URL("../dist/build-info.json", import.meta.url)));
assert.deepEqual((await readdir(new URL("../dist/", import.meta.url))).sort(), [
  "browser.js", "build-info.json", "core.js", "index.d.ts", "node.js", "xed.js", "xed.wasm",
]);
assert(WebAssembly.validate(wasm), "WASM must validate");
assert(wasm.length < 1_850_000, `WASM grew unexpectedly: ${wasm.length}`);
assert.equal(manifest.xedCommit, pins.xedCommit);
assert.equal(manifest.mbuildCommit, pins.mbuildCommit);
assert.equal(manifest.emsdkCommit, pins.emsdkCommit);
assert.equal(manifest.wasmBytes, wasm.length);
assert.equal(manifest.wasmSha256, createHash("sha256").update(wasm).digest("hex"));
assert((await stat(new URL("../dist/xed.js", import.meta.url))).size < 30_000);
const { createDisassembler } = await import("../dist/node.js");
const decoder = await createDisassembler({ wasmBinary: wasm });
assert.equal(decoder.decode(Uint8Array.of(0x90))[0].iclass, "NOP");
console.log(`Verified XED ${pins.xedVersion}: ${wasm.length} WASM bytes`);

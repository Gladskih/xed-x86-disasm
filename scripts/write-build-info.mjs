import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const pins = JSON.parse(await readFile(new URL("../upstream.json", import.meta.url)));
const wasm = await readFile(new URL("../dist/xed.wasm", import.meta.url));
await writeFile(new URL("../dist/build-info.json", import.meta.url), JSON.stringify({
  ...pins,
  buildOptions: ["--no-encoder", "--limit-strings", "--host-cpu=ia32", "-Oz", "-flto"],
  wasmBytes: wasm.length,
  wasmSha256: createHash("sha256").update(wasm).digest("hex"),
}, null, 2) + "\n");

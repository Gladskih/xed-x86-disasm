import { readFile } from "node:fs/promises";
import { loadDisassembler } from "./core.js";

/** Create a local XED decoder, optionally using supplied WASM bytes. */
export async function createDisassembler({ wasmBinary, wasmURL } = {}) {
  return loadDisassembler(wasmBinary ?? await readFile(
    wasmURL ?? new URL("./xed.wasm", import.meta.url)));
}

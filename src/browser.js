import { loadDisassembler } from "./core.js";

/** Create a local XED decoder, optionally using supplied WASM bytes. */
export async function createDisassembler({ wasmBinary, wasmURL } = {}) {
  let binary = wasmBinary;
  if (!binary) {
    const response = await fetch(wasmURL ?? new URL("./xed.wasm", import.meta.url));
    if (!response.ok) throw new Error(`Could not load XED WASM: HTTP ${response.status}`);
    binary = new Uint8Array(await response.arrayBuffer());
  }
  return loadDisassembler(binary);
}

import assert from "node:assert/strict";
import { before, test } from "node:test";
import { createDisassembler } from "../dist/node.js";

let decoder;
before(async () => { decoder = await createDisassembler(); });

test("decodes Intel text and XED taxonomy", () => {
  const result = decoder.decode(Uint8Array.of(0x90, 0xc3), { address: 0x1000n });
  assert.deepEqual(result.map(item => [item.offset, item.length, item.iclass, item.text]), [
    [0, 1, "NOP", "nop"], [1, 1, "RET_NEAR", "ret"],
  ]);
  assert.equal(result[0].isaSet, "I86");
  assert.equal(result[1].offset, 1);
});

test("returns relative branch target and wraps 64-bit addresses", () => {
  // E8 01 00 00 00: CALL rel32 +1, per Intel SDM CALL opcode.
  const result = decoder.decode(Uint8Array.of(0xe8, 1, 0, 0, 0, 0xc3),
    { address: 0xffff_ffff_ffff_fffdn });
  const instruction = result[0];
  assert.equal(instruction.target, 3n);
  assert.equal(instruction.length, 5);
  assert.equal(instruction.category, "CALL");
  assert.equal(result[1].offset, 5);
  assert.equal(result[1].iclass, "RET_NEAR");
});

test("preserves modern ISA instructions", () => {
  // EVEX VADDPS zmm0, zmm0, zmm1, from Intel XED decode fixtures.
  const instruction = decoder.decode(Uint8Array.of(0x62, 0xf1, 0x7c, 0x48, 0x58, 0xc1))[0];
  assert.equal(instruction.iclass, "VADDPS");
  assert.equal(instruction.isaSet, "AVX512F_512");
});

test("resynchronizes after invalid bytes and reports truncated tails", () => {
  const result = decoder.decode(Uint8Array.of(0xf0, 0x90, 0x0f));
  assert.deepEqual(result.map(item => [item.status, item.length]), [
    ["invalid", 1], ["decoded", 1], ["truncated", 1],
  ]);
  assert.equal(result[0].error, "BAD_LOCK_PREFIX");
  assert.equal(result[2].error, "BUFFER_TOO_SHORT");
});

test("uses 16, 32, and 64-bit XED modes", () => {
  // Opcode 60 is PUSHA/PUSHAD outside long mode and invalid in long mode.
  assert.equal(decoder.decode(Uint8Array.of(0x60), { bitness: 16 })[0].iclass, "PUSHA");
  assert.equal(decoder.decode(Uint8Array.of(0x60), { bitness: 32 })[0].iclass, "PUSHAD");
  assert.equal(decoder.decode(Uint8Array.of(0x60), { bitness: 64 })[0].status, "invalid");
});

test("accepts empty input and rejects only invalid API arguments", () => {
  assert.deepEqual(decoder.decode(new Uint8Array()), []);
  assert.throws(() => decoder.decode([0x90]), TypeError);
  assert.throws(() => decoder.decode(Uint8Array.of(0x90), { bitness: 48 }), RangeError);
  assert.throws(() => decoder.decode(Uint8Array.of(0x90), { address: -1n }), RangeError);
  assert.throws(() => decoder.decode(Uint8Array.of(0x90),
    { address: 0x1_0000_0000_0000_0000n }), RangeError);
});

test("can load caller-provided WASM and reports a missing Node asset", async () => {
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(new URL("../dist/xed.wasm", import.meta.url));
  const supplied = await createDisassembler({ wasmBinary: bytes });
  assert.equal(supplied.decode(Uint8Array.of(0x90))[0].iclass, "NOP");
  await assert.rejects(createDisassembler({ wasmURL: new URL("missing.wasm", import.meta.url) }));
});

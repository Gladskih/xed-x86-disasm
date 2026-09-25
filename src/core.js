import createModule from "./xed.js";

function validate(bytes, bitness, address) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("bytes must be a Uint8Array");
  if (![16, 32, 64].includes(bitness)) throw new RangeError("bitness must be 16, 32, or 64");
  if (typeof address !== "bigint" || address < 0n ||
      address > 0xffff_ffff_ffff_ffffn) {
    throw new RangeError("address must be an unsigned 64-bit bigint");
  }
}

function readInstruction(module, pointer, offset, address) {
  // native/bridge.c returns eleven 32-bit words, followed by pointed-to XED strings.
  const record = new DataView(module.HEAPU8.buffer, pointer, 44);
  const word = index => record.getUint32(index * 4, true);
  const location = { offset, length: word(1) };
  if (word(0) === 1 || word(0) === 2) {
    return { ...location, status: word(0) === 2 ? "truncated" : "invalid",
      error: module.UTF8ToString(word(2)) };
  }
  const displacement = BigInt.asIntN(64, BigInt(word(9)) << 32n | BigInt(word(8)));
  return { ...location, status: word(0) === 3 ? "unformatted" : "decoded",
    text: module.UTF8ToString(word(3)).trim(),
    iclass: module.UTF8ToString(word(4)),
    category: module.UTF8ToString(word(5)),
    extension: module.UTF8ToString(word(6)),
    isaSet: module.UTF8ToString(word(7)),
    ...(word(10) ? { target: BigInt.asUintN(64, address + BigInt(word(1)) +
      displacement) } : {}) };
}

export async function loadDisassembler(wasmBinary) {
  const module = await createModule({ wasmBinary });
  module._xed_initialize();
  const input = module._xed_input();
  return {
    decode(bytes, { bitness = 64, address = 0n } = {}) {
      validate(bytes, bitness, address);
      const instructions = [];
      for (let offset = 0; offset < bytes.length;) {
        // XED_MAX_INSTRUCTION_BYTES, from upstream include/public/xed/xed-common-defs.h.
        const count = Math.min(15, bytes.length - offset);
        const pc = BigInt.asUintN(64, address + BigInt(offset));
        module.HEAPU8.set(bytes.subarray(offset, offset + count), input);
        const pointer = module._xed_decode_one(count, bitness,
          Number(pc & 0xffff_ffffn), Number(pc >> 32n));
        const instruction = readInstruction(module, pointer, offset, pc);
        if (instruction.length < 1 || instruction.length > count) {
          throw new Error("XED returned an invalid instruction length");
        }
        instructions.push(instruction);
        offset += instruction.length;
      }
      return instructions;
    },
  };
}

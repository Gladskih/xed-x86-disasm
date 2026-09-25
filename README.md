# xed-x86-disasm

Small Intel XED disassembler for JavaScript and TypeScript. It contains a
prebuilt WebAssembly decoder and runs locally in browsers and Node.js, without
network access after the package is installed. The build uses upstream Intel
XED v2026.08.23 with the encoder disabled and nonessential strings removed.

```sh
npm install xed-x86-disasm
```

```js
import { createDisassembler } from "xed-x86-disasm";

const decoder = await createDisassembler();
const instructions = decoder.decode(
  Uint8Array.of(0xe8, 1, 0, 0, 0, 0xc3),
  { bitness: 64, address: 0x1000n },
);
console.log(instructions[0]);
// { offset: 0, length: 5, status: 'decoded',
//   text: 'call 0x1006', iclass: 'CALL_NEAR', category: 'CALL',
//   extension: 'BASE', isaSet: 'I86', target: 4102n }
```

`decode()` accepts 16, 32, or 64-bit mode and an unsigned 64-bit starting
address. It returns one record per instruction. Invalid bytes consume one byte
so parsing can resume. A final incomplete instruction returns `truncated` and
consumes the remaining bytes. Both include XED's error name. `unformatted`
means XED decoded the instruction but could not render its Intel text. The
`target` field is present when XED reports a relative branch displacement;
address arithmetic wraps at 64 bits. `bigint` addresses and targets need a
replacer for JSON serialization.

`isaSet`, `iclass`, `category`, and `extension` are XED names scoped to the
pinned upstream version. An ISA set is not a complete CPU compatibility test:
mode, vendor, feature dependencies, and execution conditions can matter.
This is a small disassembly API, not a drop-in replacement for iced-x86's
operand, register, instruction info, or CPUID APIs.

Browser bundlers should copy the WASM asset and pass its URL explicitly:

```js
import wasmURL from "xed-x86-disasm/xed.wasm?url";
const decoder = await createDisassembler({ wasmURL });
```

`createDisassembler({ wasmBinary })` accepts a `Uint8Array` and makes no fetch.
The default browser loader fetches the WASM next to the JavaScript module;
the Node loader reads it from disk. Use a Web Worker when decoding large byte
ranges synchronously. The package needs WebAssembly, BigInt, and Node 22+.

## Reproducible build

[`upstream.json`](upstream.json) pins the XED, mbuild, and Emscripten commits.
On Linux or WSL, install Git, Python 3, Node.js, and common C build tools,
then run:

```sh
npm ci
npm run lint
npm run build:wasm
npm test
npx playwright install chromium
npm run test:browser
npm run verify:package
```

The build script fetches pinned upstream sources and Emscripten to `.build/`,
compiles a decoder-only `libxed.a`, links the narrow C bridge, and runs
`wasm-opt -Oz`. Set `EMSDK_DIR` to a preinstalled Emscripten SDK at the pinned
commit or `BUILD_DIR` to put build intermediates elsewhere. The generated
runtime and npm package are built and tested again in GitHub Actions. The
release workflow publishes the *tested tarball* to npm and attaches the same
tarball and its SHA-256 to the GitHub release. No compiler or installation
script runs for package consumers.

The published XED WASM is about 1.78 MB uncompressed (about 634 KB with gzip
or 445 KB with Brotli). Full current ISA decode tables dominate that size;
encoder code, examples, and nonessential strings are absent. Enable HTTP
compression for the WASM asset when serving it. Removing AVX-512/EVEX saves
roughly 740 KB, but makes those instructions undecodable, so this build keeps
them. Package verification fails if the uncompressed WASM grows past 1.85 MB
without review.

Measured size variants on the pinned source and build toolchain:

| XED build flags | WASM size | Difference from release |
| --- | ---: | ---: |
| Current decoder-only build | 1,779,204 bytes | — |
| `--security-level=0` | 2,125,332 bytes | +346,128 bytes |
| `--security-level=0` with `-fPIC` retained | 1,778,908 bytes | -296 bytes |
| Compile XED objects with `-flto` | 2,104,918 bytes | +325,714 bytes |

The security-level size increase comes mainly from removing `-fPIC`. Full
cross-file LTO also increased the final artifact in this configuration. The
release keeps the smaller default flags and the full AVX-512/EVEX tables.

The wrapper is MIT-licensed. Intel XED is Apache-2.0; generated Emscripten
runtime components have their own notices. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
and the files in `licenses/`.

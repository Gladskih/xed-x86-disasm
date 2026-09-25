export interface DecodeOptions {
  /** 16-bit real mode, 32-bit legacy mode, or 64-bit long mode. */
  bitness?: 16 | 32 | 64;
  /** Unsigned 64-bit address of the first byte. */
  address?: bigint;
}

export interface LoadOptions {
  /** Load a copy of the local WASM without fetching. */
  wasmBinary?: Uint8Array;
  /** URL of the packaged WASM, or an alternate local asset. */
  wasmURL?: string | URL;
}

interface Location {
  readonly offset: number;
  /** Bytes consumed, including invalid bytes or a final truncated tail. */
  readonly length: number;
}

export interface DecodedInstruction extends Location {
  readonly status: "decoded" | "unformatted";
  readonly text: string;
  readonly iclass: string;
  readonly category: string;
  readonly extension: string;
  readonly isaSet: string;
  readonly target?: bigint;
}

export interface InvalidInstruction extends Location {
  readonly status: "invalid" | "truncated";
  readonly error: string;
}

export type DecodeResult = DecodedInstruction | InvalidInstruction;

export interface Disassembler {
  decode(bytes: Uint8Array, options?: DecodeOptions): DecodeResult[];
}

export function createDisassembler(options?: LoadOptions): Promise<Disassembler>;

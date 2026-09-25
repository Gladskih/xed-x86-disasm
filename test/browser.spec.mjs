import { expect, test } from "@playwright/test";

test("browser loads and decodes packaged XED WASM", async ({ page }) => {
  await page.goto("/test/browser.html");
  const result = await page.evaluate(async () => {
    const { createDisassembler } = await import("/dist/browser.js");
    const decoder = await createDisassembler();
    const decoded = decoder.decode(Uint8Array.of(0x90, 0x0f), { address: 0x1000n });
    return decoded;
  });
  expect(result[0]).toMatchObject({ status: "decoded", text: "nop", isaSet: "I86" });
  expect(result[1]).toMatchObject({ status: "truncated", error: "BUFFER_TOO_SHORT" });
});

test("browser reports a missing WASM asset", async ({ page }) => {
  await page.goto("/test/browser.html");
  const message = await page.evaluate(async () => {
    const { createDisassembler } = await import("/dist/browser.js");
    try {
      await createDisassembler({ wasmURL: "/dist/missing.wasm" });
      return "unexpected success";
    } catch (error) {
      return error.message;
    }
  });
  expect(message).toBe("Could not load XED WASM: HTTP 404");
});

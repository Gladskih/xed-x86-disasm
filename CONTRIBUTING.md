# Contributing

Keep the package limited to decoding, Intel formatting, and compact XED
taxonomy used for local browser analysis. Changes to the public API or
upstream pins should include a short size and compatibility explanation.

Before submitting, run `npm run lint`, `npm run build:wasm`, `npm test`,
`npm run test:browser`, `npm run verify:package`, and the packed consumer
smoke test. Test malformed and truncated streams, all modes, and addresses at
the 64-bit boundary. Keep generated files out of Git, and use imperative,
present-tense commit messages.

When changing the upstream pin, compare XED's public API and license, update
`upstream.json`, and review any change to the WASM footprint. The package
must continue working locally without external runtime services.

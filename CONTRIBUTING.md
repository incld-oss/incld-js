# Contributing

Issues and focused pull requests are welcome. For substantial API changes,
open an issue first so the public contract can be agreed before implementation.

## Local verification

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run verify:packages
bun run verify:consumer
```

Changes to a public package must include tests and a Changeset:

```bash
bun run changeset
```

Never commit API keys, webhook secrets, access tokens, customer payloads, or
generated build directories.

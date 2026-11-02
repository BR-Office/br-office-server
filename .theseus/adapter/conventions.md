# Project conventions

- Follow the upstream style: ESLint (`eslint.config.js`) and Prettier (`.prettierrc`), checked by `npm run lint:check` and `npm run format:check`.
- Keep the AGPL license header at the top of every source file, including new ones.
- CommonJS modules (`require` / `module.exports`), as in the rest of the server.
- New unit tests go in `tests/unit/<name>.tests.js` and use `@jest/globals` (the suite runs with `--inject-globals=false`).
- Commit messages follow Conventional Commits (`test(common): ...`, `docs(atlas): ...`).
- Keep packet changes small: the fork must stay easy to sync with upstream.

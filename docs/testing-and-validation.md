# Testing & Validation Guide

This project relies on a small set of npm scripts to keep behavior consistent across development machines and automation.

## Linting
Run ESLint against the entire workspace. This matches the configuration in `eslint.config.js` and is the first gate in the
validation chain.

```bash
npm run lint
```

## Unit tests
Use Vitest for component, hook, and library coverage. The `npm run test` command executes a single pass that is friendly to
CI, while `npm run test:watch` keeps the runner active for local development.

```bash
# one-off run
npm run test

# watch mode
npm run test:watch
```

## Type checking
TypeScript validation is handled with `tsc --noEmit` so you can verify that inference and interfaces line up without
producing build artifacts.

```bash
npm run typecheck
```

## Full validation bundle
Combine the above checks with `npm run validate`. Use this before pushing a branch to replicate the expected gating
sequence in automation.

```bash
npm run validate
```

## Recommended workflow
1. During active development run `npm run test:watch` in a separate terminal.
2. Before submitting changes run `npm run validate` to guarantee lint, type check, and unit tests all succeed.
3. For release candidates include the validation script in any CI jobs so pull requests and merges stay green.

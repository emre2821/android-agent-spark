# Release Tracker — 2025-11-06

## Quality Gates
- `npm run lint`
  ```
  > android-agent-spark@1.0.0 lint
  > npm --prefix apps/web-app run lint
  > agent-spark-web@0.1.0 lint
  > eslint src
  (node:4758) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///workspace/android-agent-spark/eslint.config.js?mtime=1762461146179 is not specified and it doesn't parse as CommonJS.
  ```
- `npm run typecheck`
  ```
  > android-agent-spark@1.0.0 typecheck
  > npm exec --prefix apps/web-app tsc -- --noEmit
  ```
- `npm test`
  ```
  > android-agent-spark@1.0.0 test
  > python -m pytest
  tests/backend/test_api.py ...
  tests/backend/test_migration.py ..
  tests/test_quickpost_concurrency.py .
  6 passed in 1.34s
  ```
- `npm run test:e2e`
  ```
  > android-agent-spark@1.0.0 test:e2e
  > python -m pytest tests/concurrency
  tests/test_quickpost_concurrency.py .
  1 passed in 1.16s
  ```

## Builds
- `npm run build:web`
  ```
  > android-agent-spark@1.0.0 build:web
  > npm --prefix apps/web-app run build
  > agent-spark-web@0.1.0 build
  > vite build
  warn - The `content` option in your Tailwind CSS configuration is missing or empty.
  ✓ 135 modules transformed.
  dist/assets/index-Csxwpv3h.js   243.34 kB │ gzip: 80.30 kB
  ```
- `npm run build:mobile`
  ```
  > android-agent-spark@1.0.0 build:mobile
  > node scripts/build/build_mobile.js
  Building web assets for mobile wrapper...
  > agent-spark-web@0.1.0 build
  > vite build
  Mobile web assets staged at /workspace/android-agent-spark/dist/mobile
  ```
- `npm run build:desktop`
  ```
  > android-agent-spark@1.0.0 build:desktop
  > node scripts/build/build_desktop.js
  Building web assets for desktop wrapper...
  > agent-spark-web@0.1.0 build
  > vite build
  Desktop bundle staged at /workspace/android-agent-spark/dist/desktop
  ```

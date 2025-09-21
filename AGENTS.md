# Repository Guidelines

## Project Structure & Module Organization
The Vite front end lives in `js/`, split by responsibility: UI components under `js/components/`, domain-specific flows in `js/features/`, shared logic in `js/logic/` and `js/utils/`, and Playwright helpers in `js/i18n/` and `js/translation_logic.js`. Entry points (`js/main.js`, `index.html`) wire these modules to the DOM, while generated assets land in `dist/`. Styling sits in `css/`, project notes in `docs/`, and previous build artefacts or attachments under `test-results/`. Keep new modules focused and colocate tests or fixtures with their nearest feature folder before exporting through `js/export_logic.js` when they should be reused.

## Build, Test, and Development Commands
- `npm install`: install dependencies; rerun after pulling changes that touch `package.json`.
- `npm run dev` or `npm run dev:fixedport`: start Vite; the latter pins port 5173 for Playwright and bookmarking.
- `npm run build`: produce an optimized bundle in `dist/`.
- `npm run preview`: serve the built bundle locally for release checks.
- `npm run test:e2e` / `npm run test:e2e:ui`: execute the Playwright suites headless or with the inspector.
- `npm run watch:e2e`: hot-reload dev server and rerun tests on source changes.

## Coding Style & Naming Conventions
Use modern ES modules, four-space indentation, and semicolons. Components exporting UI classes or factories should use PascalCase filenames (`UploadViewComponent.js`), while helpers and state utilities stay camelCase. Prefer descriptive Swedish copy for console messages and translation keys to match existing strings. Before pushing, ensure imports stay relative and shallow (`../utils/foo.js`) to keep bundles understandable.

## Testing Guidelines
Playwright specs live in `tests/` and follow the `*.spec.js` convention; match that pattern when adding coverage. Favor scenario-driven tests that assert absence of console errors or regressions in rulefile editing. Run `npm run test:e2e` locally and inspect `test-results/` artefacts when failures occur. Aim to keep critical flows (upload, metadata edit, requirement audit) covered; add fixtures or mock data beside the spec when needed.

## Commit & Pull Request Guidelines
Recent history uses concise, Swedish, sentence-style commit subjects that describe the user-facing effect (e.g., “Det går att visa och spara…”). Mirror that tone, avoid prefixes, and commit once per logical change. PRs should summarize the behaviour change, list impacted views or modules, and link related backlog items. Attach screenshots or screencasts when UI behaviour shifts, and note any required Playwright updates or new translations so reviewers can validate quickly.

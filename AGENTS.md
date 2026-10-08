# Repository Guidelines

## Project Structure & Module Organization

This repository is currently minimal, so keep the layout predictable as the project grows. Place application code in `src/`, tests in `tests/`, and static assets in `assets/` or `public/` depending on runtime needs. Store project-level configuration at the root, for example `package.json`, `tsconfig.json`, or `.env.example`.

Keep modules focused and colocate related files when useful. Example:

```text
src/
  features/
  lib/
tests/
assets/
```

## Build, Test, and Development Commands

No build system is committed yet. When adding one, expose the common workflows through consistent root commands so contributors have one entrypoint.

- `npm install`: install project dependencies once `package.json` exists.
- `npm run dev`: start the local development server.
- `npm test`: run the full automated test suite.
- `npm run lint`: check formatting and static analysis issues.

If the project uses a different toolchain later, keep equivalent commands available and document any deviations in `README.md`.

## Coding Style & Naming Conventions

Use 2-space indentation for JavaScript, TypeScript, JSON, and Markdown unless the adopted formatter enforces otherwise. Prefer clear, descriptive names: `user-profile.ts`, `LinkCard.tsx`, `buildUrlMap()`.

- Use `camelCase` for variables and functions.
- Use `PascalCase` for classes and component files.
- Use `kebab-case` for non-component file names.

Adopt automated formatting early, ideally with Prettier and ESLint, and run them before opening a pull request.

## Testing Guidelines

Add tests alongside the first production code added to the repository. Name test files after the unit under test, such as `link-parser.test.ts` or `LinkCard.test.tsx`. Prefer fast, deterministic tests and avoid hidden network dependencies.

Run all tests locally before submitting changes. If coverage tooling is added, keep new code covered by meaningful unit tests.

## Commit & Pull Request Guidelines

There is no existing git history in this checkout, so use a simple, consistent commit style: imperative, concise subjects such as `Add URL validation utility` or `Create API client tests`.

Pull requests should include:

- a short description of the change
- test notes describing what was run
- screenshots or recordings for UI changes
- linked issues or task references when applicable

## Configuration & Security

Do not commit secrets. Keep local values in untracked environment files and commit only sanitized examples such as `.env.example`.
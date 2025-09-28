# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts the React 18 UI; keep new screens in `components/` and share domain logic via `services/`.
- `src/types/` defines shared TypeScript interfaces; update Rust counterparts in `src-tauri/src` when these change.
- `src-tauri/src/` contains Tauri commands, with `connection_store.rs` persisting connection metadata; keep async work there.
- Static files live in `public/`; built artifacts go to `dist/`; `docker-compose.yml` spins up InfluxDB with data persisted under `influxdb-data/`.

## Build, Test, and Development Commands
- `pnpm install`: installs JavaScript dependencies; run after pulling new modules.
- `pnpm dev`: launches the Vite dev server for rapid React iteration.
- `pnpm tauri dev`: starts the desktop shell with hot reload across Rust and React.
- `pnpm build`: runs TypeScript type-checking and produces the web build under `dist/`.
- `pnpm tauri build`: compiles the distributable desktop app; ensure Rust toolchain is present.

## Coding Style & Naming Conventions
- Use 2-space indentation, single quotes, and semicolons to mirror existing React files.
- Name React components with `PascalCase`; functions, hooks, and service methods with `camelCase`.
- Co-locate component styles in sibling `.css` files; import them explicitly at the component entry.
- Mirror TypeScript DTO changes in Rust structs and re-export shared helpers from `services/` rather than duplicating logic.

## Testing Guidelines
- Automated tests are not yet configured; exercise new features through `pnpm tauri dev` and target the affected flows.
- For Rust changes, introduce `#[cfg(test)]` modules and run `cargo test` from `src-tauri`; keep tests unit-scoped.
- When adding front-end tests, prefer `vitest` + `@testing-library/react`; place specs alongside components as `<Component>.test.tsx`.

## Commit & Pull Request Guidelines
- Follow the existing `type: summary` pattern, e.g., `feat: enhance query pagination`; keep subjects under 72 characters.
- Add a short bilingual body when context benefits contributors using Chinese or English.
- Reference GitHub issues with `Closes #id` and list key verification commands in the PR description.
- Include before/after screenshots or GIFs for UI adjustments and describe any schema migrations affecting stored connections.

## Security & Configuration Tips
- Do not commit real connection credentials; sample configs belong in `.env.example` or PR notes.
- When using `docker-compose`, run `docker-compose up influxdb` and seed data into `influxdb-data/` so others can replay locally.
- Validate all Tauri command inputs in Rust before exposing them to the React renderer to keep the desktop bundle secure.

# AGENTS.md

## Project Overview

MockForge is a self-hosted Mock API platform for frontend development. It acts as a pseudo backend service: users define API routes, request parameters, and response schemas, then MockForge exposes callable HTTP endpoints that return randomly generated data matching the configured types.

The first version should stay focused on fast mock API creation and stable imported configuration. It should not attempt to model real backend persistence, complex business workflows, or relationships between APIs.

## Architecture Baseline

MockForge is code-level frontend/backend separated, but production deployment should be a single integrated web service.

Authoritative architecture for the MVP:

- Monorepo TypeScript project.
- `apps/web`: React + Vite management UI.
- `apps/server`: Node.js + Fastify backend.
- `packages/shared`: shared TypeScript types, Zod schemas, constants, and path helpers.
- The production server serves the built management UI and also exposes management APIs and Mock APIs.
- Management UI is mounted under `/__mockforge`.
- Management APIs are mounted under `/__mockforge/api`.
- User-created Mock APIs are mounted directly at the configured root-level paths, such as `/api/users`.
- Do not implement the MVP as two independently deployed services unless the user explicitly changes this decision.
- Do not implement the MVP as a frontend-only app; the core product is a callable HTTP Mock API service.

Deployment shape:

- Local development may run Vite and Fastify separately for convenience.
- Production should run one Node.js service, or one Docker container, serving both the management UI and runtime APIs.
- Frontend callers should be able to use `baseURL + API path`, for example `https://mock.example.com/api/users`.

Key persistence rule:

- Persist API configuration.
- Do not persist generated mock business data.
- Generate mock response data randomly on each matching request.

## Package Manager

- Use `pnpm` only.
- Do not use `npm` commands in this repository under any circumstance.
- Do not add npm-oriented instructions, scripts, lockfiles, or workflow examples.
- Keep `pnpm-workspace.yaml` as the workspace source of truth.
- Keep `pnpm-lock.yaml` committed.
- When adding scripts or documentation commands, use `pnpm` syntax.

## Git Workflow

- Commit messages must be written in Chinese.
- Keep commit messages concise and action-oriented.
- Prefer one coherent commit per completed development task.
- Do not commit generated build outputs, dependency folders, runtime data, or temporary files.

## Working Principles

- Prefer simple, explicit implementation over broad abstractions.
- Keep the MVP centered on API definition, random data generation, import validation, and hosted endpoint invocation.
- Treat imported AI-generated configuration as untrusted input. Validate it strictly before saving or using it.
- Preserve a clear separation between:
  - API configuration schema
  - Mock route registration
  - Random data generation
  - Web management UI
  - Runtime request handling
- Favor TypeScript-friendly structures and schemas if the project uses JavaScript/TypeScript.
- Document configuration format changes in `docs/requirements.md` or a dedicated docs file before relying on them in implementation.
- Treat `docs/requirements.md` and `docs/technical-design.md` as the source of truth before making architecture or scope decisions.
- Before continuing implementation in a new session, read `docs/milestones.md` for the current WIP status, verification gaps, and recommended next steps.

## MVP Scope

The MVP should support:

- Creating mock APIs from a web form.
- Importing mock API definitions from a structured JSON configuration.
- Defining HTTP method, path, request parameters, response status, and response body schema.
- Generating random response data based on primitive and nested field types.
- Deploying as a web service so frontend clients can call `baseURL + API path`.

The MVP should not include:

- Persistent business data.
- API-to-API data relationships.
- User authentication or permission systems.
- Real backend proxy fallback.
- Complex scenario switching.
- Database-backed state transitions.

## Documentation Expectations

- Keep product requirements and examples under `docs/`.
- Keep AI import examples precise enough that another AI can output valid JSON without guessing.
- When changing the import format, update examples and validation expectations together.
- After completing development work, update `docs/milestones.md` before reporting the task as done.
- Keep `docs/milestones.md` reader-first and concise: it should summarize current status, verified commands, active risks, and next steps.
- Do not let `docs/milestones.md` grow indefinitely. When old milestone details are no longer needed for immediate continuation, move them into an archive file such as `docs/archive/milestones-YYYY-MM.md` and keep only a short link or summary in the main milestones document.
- Prefer updating the current milestone summary over appending long chronological logs.

## Language

Use Chinese for product-facing documentation unless a file is clearly intended for code-only configuration or package metadata.

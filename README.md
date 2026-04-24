# Project Base

A TypeScript monorepo with an Express backend, React/Tailwind frontend, and a shared library. The frontend and backend communicate via [tRPC](https://trpc.io/) for end-to-end type safety.

## Project Structure

```
project-base/
├── docker/
│   └── docker-compose.yml   Dev PostgreSQL database
├── packages/
│   ├── shared/              Zod schemas, TypeScript types, and tRPC router
│   ├── webserver/           Express server exposing the tRPC API
│   └── frontend/            React + Tailwind UI consuming tRPC
├── tsconfig.base.json       Shared TypeScript compiler options
└── pnpm-workspace.yaml      pnpm workspace config
```

### `shared`

The single source of truth for the API contract. Exports:

- **Zod schemas** (`UserSchema`, `PostSchema`, etc.) for runtime validation
- **TypeScript types** inferred from those schemas
- **`appRouter`** — the tRPC router that defines all API procedures
- **`AppRouter`** — the router's type, imported by the frontend for type-safe hooks

### `webserver`

An Express server that mounts the tRPC router at `/trpc`. Runs on port 3000 by default (configurable via `PORT` env var). CORS is pre-configured for the Vite dev server.

### `frontend`

A Vite-powered React app with Tailwind CSS. Uses `@trpc/react-query` to call the backend with full autocompletion and type checking.

## Getting Started

```sh
pnpm install
pnpm db:up    # start the dev PostgreSQL database
pnpm dev
```

This starts all three packages in parallel: `shared` watches for type rebuilds, the webserver runs on **http://localhost:3000**, and the frontend runs on **http://localhost:5173**.

## Development Database

A Docker Compose setup in `docker/` provides a local PostgreSQL 17 instance. It requires [Docker](https://docs.docker.com/get-docker/) to be installed.

| Param | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| User | `dev` |
| Password | `dev` |
| Database | `project_base` |

Connection string: `postgresql://dev:dev@localhost:5432/project_base`

## Common Operations

| What | Command |
|---|---|
| Start everything | `pnpm dev` |
| Start backend only | `pnpm dev:webserver` |
| Start frontend only | `pnpm dev:frontend` |
| Start dev database | `pnpm db:up` |
| Stop dev database | `pnpm db:down` |
| Reset dev database (destroys data) | `pnpm db:reset` |
| Build all packages | `pnpm build` |
| Build shared types | `pnpm --filter shared build` |
| Type-check a package | `pnpm --filter <name> exec tsc --noEmit` |
| Add a dependency | `pnpm --filter <name> add <package>` |
| Add a dev dependency | `pnpm --filter <name> add -D <package>` |

## Adding a New tRPC Procedure

1. If needed, add a Zod schema in `packages/shared/src/types.ts`.
2. Add the procedure to the router in `packages/shared/src/router.ts`.
3. The frontend picks up the new procedure automatically via the `trpc` hooks — just call `trpc.<router>.<procedure>.useQuery()` or `.useMutation()`.

# Project Base

A TypeScript monorepo with an Express backend, React/Tailwind frontend, and a shared library. The frontend and backend communicate via [tRPC](https://trpc.io/) for end-to-end type safety. Data is persisted to PostgreSQL using [Drizzle ORM](https://orm.drizzle.team/).

## Project Structure

```
project-base/
├── docker/
│   └── docker-compose.yml   Dev PostgreSQL database
├── packages/
│   ├── shared/              Zod schemas, TypeScript types
│   ├── webserver/           Express server exposing the tRPC API
│   │   ├── src/db/          Drizzle schema, connection, and seed script
│   │   └── drizzle/         Generated SQL migration files
│   └── frontend/            React + Tailwind UI consuming tRPC
├── tsconfig.base.json       Shared TypeScript compiler options
└── pnpm-workspace.yaml      pnpm workspace config
```

### `shared`

The single source of truth for the API contract. Exports Zod schemas (`UserSchema`, `PostSchema`, etc.) and TypeScript types inferred from those schemas.

### `webserver`

An Express server that mounts the tRPC router at `/trpc`. Runs on port 3000 by default (configurable via `PORT` env var). CORS is pre-configured for the Vite dev server.

The database layer lives in `src/db/`:

| File | Purpose |
|---|---|
| `schema.ts` | Drizzle table definitions (source of truth for the DB schema) |
| `index.ts` | Database connection (exports `db`) |
| `seed.ts` | Inserts sample data for development |

### `frontend`

A Vite-powered React app with Tailwind CSS. Uses `@trpc/react-query` to call the backend with full autocompletion and type checking.

## Getting Started

```sh
pnpm install
pnpm db:up          # start the dev PostgreSQL database
pnpm db:migrate     # apply all migrations
pnpm db:seed        # insert sample users and posts
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

Override the connection string by setting the `DATABASE_URL` environment variable.

## Drizzle Migrations

The project uses [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview) to manage database migrations. The Drizzle schema in `packages/webserver/src/db/schema.ts` is the source of truth — you edit the schema, then generate a migration from it.

### Workflow

1. **Edit the schema** — modify tables/columns in `packages/webserver/src/db/schema.ts`.
2. **Generate a migration** — run `pnpm db:generate`. This diffs the schema against the last snapshot and creates a new `.sql` file in `packages/webserver/drizzle/`.
3. **Apply migrations** — run `pnpm db:migrate`. This runs all pending migrations against the database.
4. **Commit** the migration files and updated snapshot (`drizzle/` folder) to version control.

### Quick Prototyping

During early development you can skip the generate/migrate cycle and push schema changes directly:

```sh
pnpm db:push
```

This applies the current schema to the database without creating migration files. Useful for rapid iteration, but don't use it once you have production data or multiple environments.

### Drizzle Studio

```sh
pnpm db:studio
```

Opens a browser-based UI for browsing and editing database rows.

## Common Operations

| What | Command |
|---|---|
| Start everything | `pnpm dev` |
| Start backend only | `pnpm dev:webserver` |
| Start frontend only | `pnpm dev:frontend` |
| Start dev database | `pnpm db:up` |
| Stop dev database | `pnpm db:down` |
| Reset dev database (destroys data) | `pnpm db:reset` |
| Generate a migration | `pnpm db:generate` |
| Apply pending migrations | `pnpm db:migrate` |
| Push schema (no migration file) | `pnpm db:push` |
| Open Drizzle Studio | `pnpm db:studio` |
| Seed the database | `pnpm db:seed` |
| Build all packages | `pnpm build` |
| Build shared types | `pnpm --filter shared build` |
| Type-check a package | `pnpm --filter <name> exec tsc --noEmit` |
| Add a dependency | `pnpm --filter <name> add <package>` |
| Add a dev dependency | `pnpm --filter <name> add -D <package>` |

## Adding a New tRPC Procedure

1. If needed, add a Zod schema in `packages/shared/src/types.ts`.
2. Add the procedure to the router in `packages/webserver/src/router.ts`.
3. The frontend picks up the new procedure automatically via the `trpc` hooks — just call `trpc.<router>.<procedure>.useQuery()` or `.useMutation()`.

## Adding a New Table

1. Define the table in `packages/webserver/src/db/schema.ts`.
2. Run `pnpm db:generate` to create a migration.
3. Run `pnpm db:migrate` to apply it.
4. Import and query the table from your tRPC procedures.

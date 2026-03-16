# Abridge

A comprehensive school-parent communication platform built as a full-stack monorepo.

## 🏗 Tech Stack

- **Monorepo:** [Turborepo](https://turbo.build/) + [pnpm workspaces](https://pnpm.io/workspaces)
- **API:** [Fastify](https://www.fastify.io/) + [tRPC](https://trpc.io/) (v11)
- **Database:** PostgreSQL + [Prisma ORM](https://www.prisma.io/) + Redis
- **Web:** [Next.js 14](https://nextjs.org/) (App Router) + Tailwind CSS
- **Mobile:** [Expo](https://expo.dev/) (React Native)
- **CI/CD:** Forgejo (lint, test, build, deploy) + GitHub Actions (E2E tests)
- **E2E:** Playwright (web) + Maestro (mobile) + Firebase Test Lab

## 📂 Project Structure

```
schoolconnect/
├── apps/
│   ├── api/          # Fastify + tRPC API server (Port 4000)
│   ├── web/          # Next.js web application (Port 3000)
│   └── mobile/       # Expo React Native mobile app
├── packages/
│   ├── db/           # Shared Prisma schema, client, and seeds
│   └── tsconfig/     # Shared TypeScript configurations
├── docker-compose.yml # Local infrastructure (Postgres, Redis)
└── turbo.json        # Turborepo pipeline configuration
```

## 🚀 Getting Started

For a detailed guide on building and testing locally, please refer to the [Development Guide](docs/DEVELOPMENT.md).

### Prerequisites

- [Node.js](https://nodejs.org/) (v24+)
- [pnpm](https://pnpm.io/) (v9+)
- [Docker Desktop](https://www.docker.com/) (for local database)

### Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Environment Setup:**

   The project comes with default `.env` files for local development.
   - API: `apps/api/.env.example` -> `apps/api/.env` (Created automatically or manually copy)

### Database Setup

1. **Start local services (PostgreSQL + Redis):**

   ```bash
   docker compose up -d
   ```

2. **Push schema to database:**

   ```bash
   pnpm db:push
   ```

3. **Seed the database with sample data:**

   ```bash
   pnpm db:seed
   ```

### Running the App

Start all applications (API, Web, and Mobile) in development mode:

```bash
pnpm dev
```

- **Web App:** [http://localhost:3000](http://localhost:3000)
- **API Health:** [http://localhost:4000/trpc/health.check](http://localhost:4000/trpc/health.check)
- **Mobile:** Scan the QR code in the terminal with Expo Go

## 🛠 Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run unit tests across the monorepo |
| `pnpm lint` | Lint code using [Biome](https://biomejs.dev/) |
| `pnpm db:studio` | Open Prisma Studio to view/edit database data |
| `pnpm db:push` | Push Prisma schema changes to the database |
| `pnpm db:migrate` | Create and run migration files (production flow) |

## 📦 Working with the Database

The database schema is located in `packages/db/prisma/schema.prisma`.

**After modifying the schema:**

1. Update the database:
   ```bash
   pnpm db:push
   ```
2. The Prisma Client is automatically regenerated for all consuming apps.

## 🧪 Testing

| Type | Tool | Command | Location |
|------|------|---------|----------|
| Unit/Integration | [Vitest](https://vitest.dev/) | `pnpm test` | `apps/api/src/__tests__/` |
| Web E2E | [Playwright](https://playwright.dev/) | `npx playwright test` | `e2e/` (29 files, 111+ tests) |
| Mobile E2E | [Maestro](https://maestro.mobile.dev/) | `maestro test apps/mobile/.maestro/` | `apps/mobile/.maestro/` |
| Load | [k6](https://k6.io/) | `k6 run packages/load-test/` | `packages/load-test/` |

E2E tests run automatically in GitHub Actions on every push. See [docs/CICD.md](docs/CICD.md) for details.

## 📝 Code Quality

We use [Biome](https://biomejs.dev/) for both linting and formatting. It is significantly faster than ESLint + Prettier.

- Check issues: `pnpm lint`
- Fix issues & format: `pnpm lint:fix`

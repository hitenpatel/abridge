# Development Guide

This guide provides instructions on how to set up, build, and test the SchoolConnect project locally.

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: Version 24 or later (managed via `.nvmrc`).
- **pnpm**: Version 9.15.0 or later.
- **Docker**: For running database and other services.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd schoolconnect
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Environment Setup:**
    
    Copy the `.env.example` files to `.env` in the following directories and adjust values if necessary:
    
    ```bash
    # API
    cp apps/api/.env.example apps/api/.env
    
    # Web
    cp apps/web/.env.example apps/web/.env
    
    # Mobile
    cp apps/mobile/.env.example apps/mobile/.env
    ```

4.  **Start Infrastructure:**
    
    Start PostgreSQL, Redis, and Elasticsearch using Docker Compose:
    
    ```bash
    docker-compose up -d
    ```

5.  **Database Setup:**
    
    Push the Prisma schema to the database:
    
    ```bash
    pnpm db:push
    ```
    
    (Optional) Seed the database if a seed script is available:
    ```bash
    pnpm db:seed
    ```

## Running the Application

This project uses [Turbo](https://turbo.build/) to manage tasks.

### Start all applications
To start all applications (API, Web, Mobile) in development mode:

```bash
pnpm dev
```

- **Web App:** [http://localhost:3000](http://localhost:3000)
- **API Health:** [http://localhost:4000/trpc/health.check](http://localhost:4000/trpc/health.check)
- **Mobile:** Scan the QR code in the terminal with Expo Go app on your phone.

### Start specific application
To start a specific application, use the `--filter` flag:

```bash
# Start only the Web app
pnpm --filter @schoolconnect/web dev

# Start only the API
pnpm --filter @schoolconnect/api dev

# Start only the Mobile app
pnpm --filter @schoolconnect/mobile dev
```

## Testing

### Unit & Integration Tests (Vitest)

We use [Vitest](https://vitest.dev/) for unit and integration testing.

To run tests across the entire project:

```bash
pnpm test
```

To run tests for a specific package:

```bash
pnpm --filter @schoolconnect/api test
```

### End-to-End (E2E) Tests (Playwright)

We use [Playwright](https://playwright.dev/) for end-to-end testing of the web application.

1.  **Install Playwright browsers:**
    ```bash
    npx playwright install
    ```

2.  **Run E2E tests:**
    ```bash
    npx playwright test
    ```
    
    This command runs tests in headless mode. To run in UI mode for debugging:
    ```bash
    npx playwright test --ui
    ```

    The E2E tests are located in the `e2e/` directory at the root.

## Building

To build all packages and applications (excluding mobile):

```bash
pnpm build
```

To build a specific package:

```bash
pnpm --filter @schoolconnect/web build
```

**Mobile Build:**
The mobile application build is handled by EAS (Expo Application Services).
To build locally (simulators/devices), check [Expo documentation](https://docs.expo.dev/build/introduction/).

## Linting & Formatting

We use [Biome](https://biomejs.dev/) for both linting and formatting. It is significantly faster than ESLint + Prettier.

To check for linting errors/formatting:

```bash
pnpm lint
```

To automatically fix linting errors and format code:

```bash
pnpm lint:fix
```

## Database Management

Database commands are generally run from the root or filtered to `@schoolconnect/api` / `@schoolconnect/db`.

- **Migrate (Dev)**: `pnpm db:migrate` - Creates migrations.
- **Push Schema (Proto/Dev)**: `pnpm db:push` - Pushes schema directly (use for rapid prototyping).
- **Prisma Studio**: `pnpm db:studio` - Opens a web UI to view/edit data.

## Troubleshooting

### Common Issues

1.  **Port Conflicts:**
    - Ensure ports `3000` (Web) and `4000` (API) are not in use.
    - If `docker-compose` fails, check if ports `5432` (Postgres), `6379` (Redis), or `9200` (Elasticsearch) are occupied.

2.  **Database Connection Failed:**
    - Ensure Docker is running.
    - Check container status: `docker-compose ps`.
    - Verify `.env` database URL matches `docker-compose.yml` credentials.

3.  **Turbo Cache Issues:**
    - If builds or tests are behaving unexpectedly, try clearing the Turbo cache:
      ```bash
      rm -rf .turbo node_modules/.cache
      ```

## Project Structure

- **`apps/`**: Contains the application source code.
    - **`api`**: Node.js/Fastify backend (Port 4000).
    - **`web`**: Next.js frontend (Port 3000).
    - **`mobile`**: React Native/Expo mobile app.
- **`packages/`**: Shared packages.
    - **`db`**: Prisma database schema and client.
    - **`tsconfig`**: Shared TypeScript configurations.
- **`e2e/`**: Playwright end-to-end tests.

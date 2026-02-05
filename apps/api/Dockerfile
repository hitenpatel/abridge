# Stage 1 - base
FROM node:24-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Stage 2 - deps
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json
RUN pnpm install --frozen-lockfile --filter @schoolconnect/api...

# Stage 3 - builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY packages/tsconfig ./packages/tsconfig

COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd packages/db && pnpm exec prisma generate

# Copy generated .prisma/client to where @prisma/client expects it
RUN cp -r /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma /app/packages/db/node_modules/

# Build TypeScript
RUN cd apps/api && pnpm build

# Create JS versions of packages/db (these files are simple, just strip types)
RUN cat <<'EOFJS' > packages/db/src/index.js
export { prisma } from "./client.js";
export * from "@prisma/client";
EOFJS
RUN cat <<'EOFJS' > packages/db/src/client.js
import { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
EOFJS

# Update packages/db exports to point to compiled .js files and add type: module
RUN node -e " \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('packages/db/package.json', 'utf8')); \
  pkg.type = 'module'; \
  pkg.main = './src/index.js'; \
  pkg.exports = { '.': './src/index.js', './client': './src/client.js' }; \
  fs.writeFileSync('packages/db/package.json', JSON.stringify(pkg, null, 2)); \
"

# Stage 4 - runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace manifests (needed for pnpm exec in migrate container)
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json

# Copy packages/db with compiled JS and updated package.json from builder
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/src ./packages/db/src
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

# Copy node_modules from builder (includes generated Prisma client for this platform)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser
USER apiuser

EXPOSE 4000

WORKDIR /app/apps/api
CMD ["node", "--import", "tsx", "dist/index.js"]

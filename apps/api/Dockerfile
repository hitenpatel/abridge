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
COPY --from=deps /app/packages/tsconfig ./packages/tsconfig

COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd packages/db && pnpm exec prisma generate

# Build TypeScript
RUN cd apps/api && pnpm build

# Stage 4 - runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace structure for pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json

# Install production deps only
RUN pnpm install --frozen-lockfile --filter @schoolconnect/api... --prod

# Copy Prisma schema and generate for correct platform (linux-musl-openssl)
COPY packages/db/prisma ./packages/db/prisma
RUN cd packages/db && pnpm exec prisma generate

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy migrations for the migrate init container
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser
USER apiuser

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]

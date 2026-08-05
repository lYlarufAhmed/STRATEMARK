FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.3 --activate

# Copy root manifests and configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy package.json files for dependency graph
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/research/package.json ./packages/research/
COPY packages/mocks/package.json ./packages/mocks/
COPY apps/sentinel/package.json ./apps/sentinel/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/web/package.json ./apps/web/

# Install dependencies for workspace
RUN pnpm install

# Copy source code
COPY packages/contracts ./packages/contracts
COPY packages/research ./packages/research
COPY apps/sentinel ./apps/sentinel

# Build sentinel
RUN pnpm --filter @mi/sentinel build

# Deploy standalone package into /prod/sentinel
RUN pnpm --filter @mi/sentinel deploy --legacy --prod /prod/sentinel

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /prod/sentinel ./

EXPOSE 8080

CMD ["node", "dist/index.js"]

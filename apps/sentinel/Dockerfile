FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/sentinel/package.json ./apps/sentinel/
RUN corepack enable && pnpm install --no-frozen-lockfile
COPY packages/contracts ./packages/contracts
COPY apps/sentinel ./apps/sentinel
RUN pnpm --filter @mi/contracts build
RUN pnpm --filter @mi/sentinel build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/apps/sentinel/package.json ./package.json
COPY --from=builder /app/apps/sentinel/dist ./dist

RUN npm install --omit=dev --no-audit --no-fund

EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/index.js"]

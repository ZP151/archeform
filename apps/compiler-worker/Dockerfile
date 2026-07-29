FROM node:22-alpine AS build
WORKDIR /workspace
COPY . .
RUN npm config set fetch-retries 5 && npm config set fetch-retry-maxtimeout 120000 && npm install --global pnpm@9.0.0
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @factory/graph build && pnpm --filter @factory/capabilities build && pnpm --filter @factory/compiler build && pnpm --filter @factory/compiler-worker build

FROM node:22-alpine
WORKDIR /workspace
COPY --from=build /workspace /workspace
RUN apk add --no-cache docker-cli docker-cli-compose
RUN npm install --global pnpm@9.0.0
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@factory/compiler-worker", "start"]

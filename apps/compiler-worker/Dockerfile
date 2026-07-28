FROM node:22-alpine AS build
WORKDIR /workspace
COPY . .
RUN npm config set fetch-retries 5 && npm config set fetch-retry-maxtimeout 120000 && npm install --global pnpm@9.0.0
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @factory/compiler-worker build

FROM node:22-alpine
WORKDIR /workspace
COPY --from=build /workspace /workspace
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@factory/compiler-worker", "start"]

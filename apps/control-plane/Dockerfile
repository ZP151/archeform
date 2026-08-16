FROM node:22-alpine AS build
WORKDIR /workspace
COPY . .
RUN npm config set fetch-retries 5 && npm config set fetch-retry-maxtimeout 120000 && npm install --global pnpm@9.0.0
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @factory/control-plane prisma:generate
RUN pnpm --filter @factory/graph build && pnpm --filter @factory/capabilities build && pnpm --filter @factory/ui-primitives build && pnpm --filter @factory/ui-patterns build && pnpm --filter @factory/generated-ui build && pnpm --filter @factory/screen-recipes build && pnpm --filter @factory/experience-recipes build && pnpm --filter @factory/compiler build && pnpm --filter @factory/adapters build && pnpm --filter @factory/portfolio-public build && pnpm --filter @factory/control-plane build

FROM node:22-alpine
WORKDIR /workspace
COPY --from=build /workspace /workspace
RUN npm install --global pnpm@9.0.0
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @factory/control-plane exec prisma db push && pnpm --filter @factory/control-plane start"]

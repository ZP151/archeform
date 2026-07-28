FROM node:22-alpine AS build
WORKDIR /workspace
ARG NEXT_PUBLIC_CONTROL_PLANE_URL
ENV NEXT_PUBLIC_CONTROL_PLANE_URL=$NEXT_PUBLIC_CONTROL_PLANE_URL
COPY . .
RUN npm config set fetch-retries 5 && npm config set fetch-retry-maxtimeout 120000 && npm install --global pnpm@9.0.0
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @factory/graph build && pnpm --filter @factory/adapters build && pnpm --filter @factory/workbench build

FROM node:22-alpine
WORKDIR /workspace
COPY --from=build /workspace /workspace
RUN npm install --global pnpm@9.0.0
ENV NODE_ENV=production
EXPOSE 5174
CMD ["pnpm", "--filter", "@factory/workbench", "start"]

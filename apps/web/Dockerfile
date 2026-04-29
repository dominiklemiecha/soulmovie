# Build stage
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /workspace
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @soulmovie/shared build && pnpm --filter @soulmovie/web build

# Runtime stage
FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80

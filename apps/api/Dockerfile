# Build stage
FROM node:20-alpine AS build
RUN apk add --no-cache git python3 make g++ \
 && corepack enable \
 && corepack prepare pnpm@9.12.3 --activate
WORKDIR /workspace
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @soulmovie/shared build && pnpm --filter @soulmovie/api build

# Runtime stage — copia struttura completa con node_modules per evitare problemi di symlink pnpm
FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=build /workspace/package.json /workspace/pnpm-workspace.yaml ./
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/package.json ./apps/api/
COPY --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/migrations ./apps/api/migrations
COPY --from=build /workspace/apps/api/seeds ./apps/api/seeds
COPY --from=build /workspace/packages/shared/package.json ./packages/shared/
COPY --from=build /workspace/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /workspace/packages/shared/dist ./packages/shared/dist
ENV NODE_ENV=production
ENV API_PORT=3000
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","apps/api/dist/src/main.js"]

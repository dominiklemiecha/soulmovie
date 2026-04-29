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
RUN pnpm --filter @soulmovie/shared build && pnpm --filter @soulmovie/api build \
 && cd apps/api && npx tsc -p tsconfig.json --outDir dist-seeds seeds/bootstrap-admin.ts \
   --module CommonJS --moduleResolution Node --target ES2022 \
   --experimentalDecorators --emitDecoratorMetadata --esModuleInterop --skipLibCheck

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache tini && corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
COPY --from=build /workspace/package.json /workspace/pnpm-workspace.yaml /workspace/pnpm-lock.yaml ./
COPY --from=build /workspace/apps/api/package.json apps/api/
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/migrations apps/api/migrations
COPY --from=build /workspace/apps/api/seeds apps/api/seeds
COPY --from=build /workspace/apps/api/dist-seeds apps/api/dist-seeds
COPY --from=build /workspace/packages/shared/package.json packages/shared/
COPY --from=build /workspace/packages/shared/dist packages/shared/dist
RUN pnpm install --prod --frozen-lockfile=false --filter @soulmovie/api... \
 && pnpm store prune
ENV NODE_ENV=production
ENV API_PORT=3000
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","apps/api/dist/main.js"]

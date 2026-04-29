FROM node:20-alpine

RUN apk add --no-cache git python3 make g++ \
 && corepack enable \
 && corepack prepare pnpm@9.12.3 --activate

WORKDIR /workspace

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

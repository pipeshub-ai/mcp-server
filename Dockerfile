FROM oven/bun:1 AS builder

WORKDIR /app

COPY pipeshub-mcp-typescript/package.json ./
RUN bun install

COPY pipeshub-mcp-typescript/ .
RUN bun run build

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/bin ./bin
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

ENTRYPOINT ["node", "bin/mcp-server.js", "start"]

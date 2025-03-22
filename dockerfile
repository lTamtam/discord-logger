FROM oven/bun:alpine
WORKDIR /app
COPY . .
RUN bun install
RUN bunx prisma generate
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
CMD bunx prisma db push && bun refresh && bun bot
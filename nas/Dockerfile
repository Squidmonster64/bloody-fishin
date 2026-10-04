FROM --platform=linux/amd64 node:22-bookworm-slim AS build
WORKDIR /src
COPY package.json pnpm-lock.yaml ./
COPY patches patches
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec vite build --config nas/vite.config.ts && pnpm exec esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && pnpm prune --prod
FROM --platform=linux/amd64 node:22-bookworm-slim
WORKDIR /app
RUN groupadd -g 10001 suite && useradd -u 10001 -g 10001 -M suite
COPY --from=build --chown=10001:10001 /src/dist dist
COPY --from=build --chown=10001:10001 /src/node_modules node_modules
COPY --from=build /src/package.json ./
USER 10001:10001
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node","dist/index.js"]

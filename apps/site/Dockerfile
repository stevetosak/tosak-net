# The tosak.net site: built with Node, served by unprivileged nginx.
# Build from the repository root: docker build -f apps/site/Dockerfile .

FROM node:24.22.3-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS build
WORKDIR /repo
RUN corepack enable
# The store first, from the lockfile alone, so a source change keeps this layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @tosak/site... \
 && pnpm --filter @tosak/site build

FROM nginxinc/nginx-unprivileged:1.30.6-alpine-slim@sha256:5d8bb9437d74a600ec5dbf90c035451c724dc33eac8d3a71078f6f8612c345f6
COPY apps/site/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /repo/apps/site/dist /usr/share/nginx/html
USER 10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/health/live || exit 1

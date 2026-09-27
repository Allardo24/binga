FROM node:24-bookworm-slim AS web
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run web:build

FROM rust:1.98-bookworm AS rust
WORKDIR /build
COPY server ./server
RUN cargo build --locked --release --manifest-path server/Cargo.toml

FROM debian:bookworm-slim
ARG BUILD_VERSION=0.1.0
ARG BUILD_ARCH=aarch64
ARG SOURCE_REPOSITORY=""
LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}" \
  org.opencontainers.image.source="${SOURCE_REPOSITORY}"
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=rust /build/server/target/release/binga-server /app/binga-server
COPY --from=web /build/dist /app/web
ENV BINGA_BIND=0.0.0.0:8080 BINGA_DATA_DIR=/data BINGA_WEB_DIR=/app/web
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1
CMD ["/app/binga-server"]

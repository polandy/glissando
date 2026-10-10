# The self-hosted Glissando (ADR-0013): the static build served by Caddy, plus the route
# /immich/ to the Immich server named in IMMICH_URL, plus the library service for slideshows on
# the server when a data volume is set (ADR-0018). Build from the repository root:
#   docker build -f deploy/Dockerfile .

# Matches .node-version.
FROM node:26.9.0-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-fund --no-audit
COPY . .
RUN npm run build && npm run build:server

FROM caddy:2.11.7-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f AS caddy

# The build's Node image: it runs the library service, and carries Caddy's binary.
FROM node:26.9.0-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
# Caddy keeps nothing worth persisting here (no certificates, no saved config).
ENV XDG_CONFIG_HOME=/tmp/caddy-config XDG_DATA_HOME=/tmp/caddy-data
COPY deploy/Caddyfile deploy/immich-proxy.caddy deploy/immich-off.caddy deploy/library-on.caddy deploy/library-off.caddy /etc/caddy/
COPY --chmod=0755 deploy/entrypoint.sh /usr/local/bin/glissando-entrypoint
COPY --from=build /app/dist /srv
COPY --from=build /app/dist-server/glissando-library.mjs /usr/local/lib/glissando/
COPY deploy/supervise.sh /usr/local/lib/glissando/
# A named volume mounted here starts out owned by the user the container runs as.
RUN mkdir /data && chown 10001:10001 /data
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/glissando-entrypoint"]
# Node's image would hand the entrypoint "node" as an argument.
CMD []

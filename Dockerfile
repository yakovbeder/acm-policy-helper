# Stage 1: Build frontend
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS frontend-build
WORKDIR /opt/app-root/src/frontend
USER 0
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build \
  && chown -R 1001:0 /opt/app-root/src/frontend/dist

# Stage 2: Build backend
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS backend-build
WORKDIR /opt/app-root/src/backend
USER 0
COPY backend/package.json ./
RUN npm install
COPY backend/ ./
RUN npm run build \
  && npm prune --omit=dev \
  && chown -R 1001:0 /opt/app-root/src/backend/dist \
  && chown -R 1001:0 /opt/app-root/src/backend/node_modules

# Stage 3: Runtime
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:latest
WORKDIR /opt/app-root/src

USER 0
ADD https://github.com/open-cluster-management-io/policy-generator-plugin/releases/download/v1.19.0/linux-amd64-PolicyGenerator /usr/local/bin/PolicyGenerator
RUN chmod +x /usr/local/bin/PolicyGenerator \
  && mkdir -p /opt/app-root/src/public \
  && chown -R 1001:0 /opt/app-root/src

COPY --from=backend-build /opt/app-root/src/backend/dist ./dist
COPY --from=backend-build /opt/app-root/src/backend/node_modules ./node_modules
COPY --from=backend-build /opt/app-root/src/backend/package.json ./package.json
COPY --from=frontend-build /opt/app-root/src/frontend/dist ./public

ENV PORT=8080 \
    PUBLIC_DIR=/opt/app-root/src/public \
    POLICY_GENERATOR_BIN=/usr/local/bin/PolicyGenerator \
    NODE_ENV=production

USER 1001
EXPOSE 8080
CMD ["node", "dist/server.js"]

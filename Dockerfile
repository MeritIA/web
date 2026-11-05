# syntax=docker/dockerfile:1

# Imagen del frontend: compila Angular y lo sirve con nginx sin privilegios.
# Hace de proxy de `/api` hacia el backend, en el mismo origen: la cookie de
# sesion es HttpOnly + SameSite=strict y desde otro origen no viajaria.
ARG NODE_VERSION=24.16-slim
ARG NGINX_VERSION=1.29-alpine

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runtime
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
# La imagen sin privilegios escucha en 8080 y corre como usuario `nginx`.
# BACKEND_UPSTREAM se sustituye al arrancar (plantillas de la imagen oficial).
ENV BACKEND_UPSTREAM=backend-api:3000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

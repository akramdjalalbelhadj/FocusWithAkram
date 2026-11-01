# syntax=docker/dockerfile:1
# Contexte de build : racine du depot (Angular importe ../shared). Voir docker-compose.yml.
FROM node:24-alpine AS build
WORKDIR /build/frontend-angular
COPY frontend-angular/package.json frontend-angular/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY shared /build/shared
COPY frontend-angular ./
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY frontend-angular/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/frontend-angular/dist/frontend-angular/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

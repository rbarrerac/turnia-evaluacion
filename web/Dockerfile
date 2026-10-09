# Módulo: Imagen del frontend de Turnia — construcción con Vite y servicio con Nginx (HTTPS)
# Proyecto: Turnia
# Autor: Luis
# Fecha de creación: 08/10/2026

# ---------- Etapa 1: construcción del frontend ----------
FROM node:20-bookworm-slim AS construccion

# Vacía a propósito: el frontend y la API comparten origen detrás de Nginx, así que
# las peticiones salen a rutas relativas (/api/... y /archivos/...).
ARG VITE_URL_API=""
ENV VITE_URL_API=${VITE_URL_API}

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: servidor Nginx ----------
FROM nginx:1.27-alpine

# openssl: genera el certificado autofirmado en el primer arranque.
RUN apk add --no-cache openssl

ENV NOMBRE_SERVIDOR=turnia.local

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/10-generar-certificado.sh /docker-entrypoint.d/10-generar-certificado.sh
# (sed quita un posible CR de Windows por si el archivo llegó con fin de línea CRLF).
RUN sed -i 's/\r$//' /docker-entrypoint.d/10-generar-certificado.sh /etc/nginx/conf.d/default.conf \
    && chmod 755 /docker-entrypoint.d/10-generar-certificado.sh \
    && mkdir -p /etc/nginx/certificados

COPY --from=construccion /app/dist /usr/share/nginx/html

EXPOSE 80 443

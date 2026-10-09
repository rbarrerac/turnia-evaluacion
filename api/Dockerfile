# Módulo: Imagen de la API de Turnia (Node.js 20 + Prisma) para el despliegue con Docker
# Proyecto: Turnia
# Autor: Ronald
# Fecha de creación: 08/10/2026
#
# Se construye en la propia Raspberry Pi 5 (ARM64): Prisma detecta la plataforma
# (linux-arm64, OpenSSL 3) durante "npm ci" / "prisma generate" y descarga sus motores.

FROM node:20-bookworm-slim

# openssl: lo exigen los motores de Prisma. ca-certificates: conexiones TLS salientes
# (SMTP y descarga de motores de Prisma). tzdata: zona horaria del contenedor.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    TZ=America/Guatemala \
    CHECKPOINT_DISABLE=1

WORKDIR /app

# Dependencias de ejecución únicamente (sin Jest, ESLint, nodemon ni Supertest).
# "prisma" (la CLI) está en dependencies porque el arranque ejecuta "prisma db push".
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
# Nombre propio para no pisar el docker-entrypoint.sh de la imagen base de Node.
COPY docker-entrypoint.sh /usr/local/bin/turnia-entrypoint.sh
# (sed quita un posible CR de Windows por si el archivo llegó con fin de línea CRLF).
RUN sed -i 's/\r$//' /usr/local/bin/turnia-entrypoint.sh \
    && chmod 755 /usr/local/bin/turnia-entrypoint.sh \
    && mkdir -p /app/almacenamiento/trabajos \
    && chown -R node:node /app/almacenamiento

# Usuario sin privilegios (ya existe en la imagen oficial de Node). Al montarse por primera
# vez, el volumen con nombre copia /app/almacenamiento de la imagen con su dueño (node).
USER node

EXPOSE 4000

ENTRYPOINT ["turnia-entrypoint.sh"]
CMD ["node", "src/servidor.js"]

#!/bin/sh
# Módulo: Punto de entrada del contenedor de la API — prepara la base y arranca el servidor
# Proyecto: Turnia
# Autor: Ronald
# Fecha de creación: 08/10/2026
#
# En cada arranque (todos los pasos son idempotentes):
#   1. Espera a que PostgreSQL acepte conexiones (con reintentos).
#   2. Sincroniza las tablas con el esquema de Prisma (prisma db push).
#   3. Aplica la restricción EXCLUDE y las CHECK (prisma/aplicarRestricciones.js).
#   4. Carga los datos semilla sin duplicar (prisma/semilla.js).
#   5. Reemplaza este proceso por el comando del contenedor (node src/servidor.js).
set -e

INTENTOS_MAXIMOS="${INTENTOS_BD:-30}"
ESPERA_SEGUNDOS="${ESPERA_BD_SEGUNDOS:-2}"

echo "[turnia] Esperando a que la base de datos acepte conexiones..."
intento=1
until node -e "
  const { Client } = require('pg');
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  cliente.connect().then(() => cliente.end()).then(() => process.exit(0)).catch(() => process.exit(1));
" >/dev/null 2>&1; do
  if [ "$intento" -ge "$INTENTOS_MAXIMOS" ]; then
    echo "[turnia] ERROR: la base de datos no respondió después de $INTENTOS_MAXIMOS intentos."
    echo "[turnia] Revisa 'docker compose logs db' y que PG_USUARIO/PG_CLAVE/PG_BD coincidan con DATABASE_URL."
    exit 1
  fi
  echo "[turnia] La base aún no responde (intento $intento de $INTENTOS_MAXIMOS); reintentando en ${ESPERA_SEGUNDOS} s..."
  intento=$((intento + 1))
  sleep "$ESPERA_SEGUNDOS"
done
echo "[turnia] Base de datos disponible."

echo "[turnia] Sincronizando las tablas con el esquema de Prisma..."
npx prisma db push --skip-generate

echo "[turnia] Aplicando restricciones (sin_superposicion y CHECK)..."
node prisma/aplicarRestricciones.js

echo "[turnia] Cargando datos semilla (no duplica lo que ya existe)..."
node prisma/semilla.js

echo "[turnia] Preparación terminada. Iniciando la API..."
exec "$@"

#!/usr/bin/env bash
# Módulo: Registro de disponibilidad (RNF-04) — una verificación de /api/salud por ejecución
# Proyecto: Turnia
# Autor: Ronald
# Fecha de creación: 08/10/2026
#
# Hace una petición a la API a través de Nginx y agrega una línea al CSV:
#   fecha_iso,codigo_http,tiempo_ms
# Un código 000 significa que no hubo respuesta (servicio caído o tiempo agotado).
# Pensado para ejecutarse cada minuto con cron en la Raspberry Pi (ver DESPLIEGUE.md).
#
# Uso:  scripts/disponibilidad/registrar.sh [ruta_del_csv]
# Variables opcionales:
#   URL_SALUD         (por defecto https://localhost/api/salud)
#   TIEMPO_LIMITE_S   (por defecto 5 segundos)
set -u

DIRECTORIO_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIRECTORIO_PROYECTO="$(cd "$DIRECTORIO_SCRIPT/../.." && pwd)"

ARCHIVO_CSV="${1:-$DIRECTORIO_PROYECTO/registros/disponibilidad.csv}"
URL_SALUD="${URL_SALUD:-https://localhost/api/salud}"
TIEMPO_LIMITE_S="${TIEMPO_LIMITE_S:-5}"

mkdir -p "$(dirname "$ARCHIVO_CSV")"
if [ ! -s "$ARCHIVO_CSV" ]; then
  echo "fecha_iso,codigo_http,tiempo_ms" > "$ARCHIVO_CSV"
fi

# Hora de Guatemala con su desfase (-06:00) aunque la Pi esté en UTC. "CST6" es la zona
# POSIX de UTC-6 fijo, igual a America/Guatemala (sin horario de verano desde 2006).
FECHA="$(TZ=CST6 date --iso-8601=seconds)"

# -k acepta el certificado autofirmado; -s silencioso; -o descarta el cuerpo.
# curl devuelve "000" en http_code cuando no hay respuesta; si curl falla del todo,
# el "|| true" evita que el script se detenga sin registrar la línea.
RESULTADO="$(curl -k -s -o /dev/null --max-time "$TIEMPO_LIMITE_S" \
  -w '%{http_code} %{time_total}' "$URL_SALUD" 2>/dev/null || true)"

CODIGO="${RESULTADO%% *}"
SEGUNDOS="${RESULTADO##* }"
[ -n "$CODIGO" ] || CODIGO="000"
[ -n "$SEGUNDOS" ] && [ "$SEGUNDOS" != "$RESULTADO" ] || SEGUNDOS="$TIEMPO_LIMITE_S"

# time_total viene en segundos con decimales (p. ej. 0.012345); se pasa a milisegundos
# enteros con awk (forzando el punto decimal, sin depender del idioma del sistema).
TIEMPO_MS="$(LC_ALL=C awk -v s="$SEGUNDOS" 'BEGIN { printf "%d", s * 1000 + 0.5 }')"

echo "$FECHA,$CODIGO,$TIEMPO_MS" >> "$ARCHIVO_CSV"

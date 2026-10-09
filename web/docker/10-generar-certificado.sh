#!/bin/sh
# Módulo: Genera un certificado TLS autofirmado para Nginx si todavía no existe uno
# Proyecto: Turnia
# Autor: Luis
# Fecha de creación: 08/10/2026
#
# Lo ejecuta automáticamente el entrypoint de la imagen oficial de Nginx (todo script
# de /docker-entrypoint.d/ se corre antes de iniciar Nginx). El certificado se guarda
# en el volumen "certificados", así que se genera una sola vez y sobrevive a reinicios.
# Si el usuario coloca su propio turnia.crt y turnia.key en el volumen, se respetan.
set -e

DIRECTORIO="/etc/nginx/certificados"
CERTIFICADO="$DIRECTORIO/turnia.crt"
LLAVE="$DIRECTORIO/turnia.key"
NOMBRE="${NOMBRE_SERVIDOR:-turnia.local}"

mkdir -p "$DIRECTORIO"

if [ -s "$CERTIFICADO" ] && [ -s "$LLAVE" ]; then
  echo "[turnia] Se usa el certificado existente en $DIRECTORIO (no se genera uno nuevo)."
  exit 0
fi

# Si NOMBRE_SERVIDOR es una dirección IPv4 se agrega como IP en el SAN; si no, como DNS.
if echo "$NOMBRE" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  SAN="IP:$NOMBRE,DNS:localhost,IP:127.0.0.1"
else
  SAN="DNS:$NOMBRE,DNS:localhost,IP:127.0.0.1"
fi

echo "[turnia] Generando certificado autofirmado para \"$NOMBRE\" (válido 825 días)..."
openssl req -x509 -nodes -newkey rsa:2048 \
  -days 825 \
  -keyout "$LLAVE" \
  -out "$CERTIFICADO" \
  -subj "/CN=$NOMBRE/O=Turnia" \
  -addext "subjectAltName=$SAN" \
  -addext "keyUsage=digitalSignature,keyEncipherment" \
  -addext "extendedKeyUsage=serverAuth" >/dev/null 2>&1

chmod 600 "$LLAVE"
chmod 644 "$CERTIFICADO"
echo "[turnia] Certificado generado: $CERTIFICADO"
